// Edge function: fired by a Supabase Database Webhook on INSERT into
// auth.users. Sends the site owner a Discord DM whenever someone new
// signs up. Uses the Discord bot's plain REST API (open a DM channel,
// then post to it) — no gateway connection needed, so this can run
// as a one-shot HTTP call from a serverless function.
//
// Requires the bot to share at least one server with the owner —
// Discord won't let a bot open a DM with someone it has no server in
// common with, even with a valid token and user ID.
//
// Deploy with: supabase functions deploy notify-signup
//
// Required secrets (set via `supabase secrets set ...`):
//   DISCORD_BOT_TOKEN   - bot token from the Discord Developer Portal
//   DISCORD_OWNER_ID    - your Discord user ID (right-click your name
//                          with Developer Mode on -> Copy User ID)
//   SIGNUP_WEBHOOK_SECRET - any random string you make up; must match
//                          the header value you set on the Database
//                          Webhook in the Supabase dashboard, so this
//                          function only ever runs off a real webhook
//                          call and not a stray public POST.

const DISCORD_BOT_TOKEN = Deno.env.get("DISCORD_BOT_TOKEN")!;
const DISCORD_OWNER_ID = Deno.env.get("DISCORD_OWNER_ID")!;
const SIGNUP_WEBHOOK_SECRET = Deno.env.get("SIGNUP_WEBHOOK_SECRET")!;

interface WebhookPayload {
  type: string;
  table: string;
  record?: {
    email?: string | null;
    raw_user_meta_data?: Record<string, unknown> | null;
    created_at?: string;
  };
}

async function sendDiscordDM(content: string): Promise<void> {
  const channelRes = await fetch("https://discord.com/api/v10/users/@me/channels", {
    method: "POST",
    headers: {
      Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ recipient_id: DISCORD_OWNER_ID }),
  });

  if (!channelRes.ok) {
    throw new Error(
      `Failed to open DM channel: ${channelRes.status} ${await channelRes.text()}`,
    );
  }

  const channel = await channelRes.json();

  const messageRes = await fetch(
    `https://discord.com/api/v10/channels/${channel.id}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content }),
    },
  );

  if (!messageRes.ok) {
    throw new Error(
      `Failed to send DM: ${messageRes.status} ${await messageRes.text()}`,
    );
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const providedSecret = req.headers.get("x-webhook-secret");
  if (providedSecret !== SIGNUP_WEBHOOK_SECRET) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
    });
  }

  if (payload.type !== "INSERT" || payload.table !== "users") {
    // Not the event we care about — acknowledge and do nothing.
    return new Response(JSON.stringify({ skipped: true }), { status: 200 });
  }

  const email = payload.record?.email ?? "unknown email";
  const name =
    (payload.record?.raw_user_meta_data?.full_name as string | undefined) ??
    (payload.record?.raw_user_meta_data?.name as string | undefined) ??
    null;

  const content = name
    ? `🆕 New signup on the dashboard: **${name}** (${email})`
    : `🆕 New signup on the dashboard: ${email}`;

  try {
    await sendDiscordDM(content);
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
