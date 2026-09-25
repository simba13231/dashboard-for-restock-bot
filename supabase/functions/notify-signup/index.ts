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
//   SITE_URL            - optional, defaults to the GitHub Pages URL
//                          below. Used only to point the embed's
//                          banner image at the right host.

const DISCORD_BOT_TOKEN = Deno.env.get("DISCORD_BOT_TOKEN")!;
const DISCORD_OWNER_ID = Deno.env.get("DISCORD_OWNER_ID")!;
const SIGNUP_WEBHOOK_SECRET = Deno.env.get("SIGNUP_WEBHOOK_SECRET")!;
const SITE_URL =
  Deno.env.get("SITE_URL") ??
  "https://simba13231.github.io/dashboard-for-restock-bot";

const EMBED_COLOR = 0x5b3dd6; // matches the banner's indigo gradient

interface WebhookPayload {
  type: string;
  table: string;
  record?: {
    email?: string | null;
    raw_user_meta_data?: Record<string, unknown> | null;
    raw_app_meta_data?: { provider?: string } | null;
    created_at?: string;
  };
}

interface SignupInfo {
  email: string;
  name: string | null;
  provider: string;
  createdAt: string;
}

async function sendDiscordDM(info: SignupInfo): Promise<void> {
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

  const embed = {
    title: "🆕 New sign-up",
    description: info.name
      ? `**${info.name}** just logged into the dashboard.`
      : "Someone just logged into the dashboard.",
    color: EMBED_COLOR,
    fields: [
      { name: "Email", value: info.email, inline: true },
      { name: "Provider", value: info.provider, inline: true },
    ],
    image: { url: `${SITE_URL}/notify/signup-banner.png` },
    footer: { text: "PS99 Restock Dashboard" },
    timestamp: info.createdAt,
  };

  const messageRes = await fetch(
    `https://discord.com/api/v10/channels/${channel.id}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ embeds: [embed] }),
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

  const info: SignupInfo = {
    email: payload.record?.email ?? "unknown email",
    name:
      (payload.record?.raw_user_meta_data?.full_name as string | undefined) ??
      (payload.record?.raw_user_meta_data?.name as string | undefined) ??
      null,
    provider: payload.record?.raw_app_meta_data?.provider ?? "unknown",
    createdAt: payload.record?.created_at ?? new Date().toISOString(),
  };

  try {
    await sendDiscordDM(info);
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
