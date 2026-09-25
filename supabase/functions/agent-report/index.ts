// Edge function: the local Python agent POSTs its live status here.
// Auth is a per-bot secret key (header "x-agent-key"), NOT a Supabase
// user session — the agent runs unattended on someone's desktop, it
// never logs in as the user. We only ever store a SHA-256 hash of the
// key, so a leaked database dump doesn't hand out working keys.
//
// Deploy with: supabase functions deploy agent-report

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const agentKey = req.headers.get("x-agent-key");
  if (!agentKey) {
    return new Response(JSON.stringify({ error: "Missing x-agent-key" }), {
      status: 401,
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const keyHash = await sha256Hex(agentKey);

  const { data: bot, error: botError } = await supabase
    .from("bots")
    .select("id, markup_percent")
    .eq("agent_key_hash", keyHash)
    .maybeSingle();

  if (botError || !bot) {
    return new Response(JSON.stringify({ error: "Invalid agent key" }), {
      status: 401,
    });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
    });
  }

  const statusUpdate = {
    bot_id: bot.id,
    connected: Boolean(body.connected),
    bot_user: typeof body.bot_user === "string" ? body.bot_user : null,
    booth_full: Boolean(body.booth_full),
    booth_last_read:
      typeof body.booth_last_read === "string" ? body.booth_last_read : null,
    last_event:
      typeof body.last_event === "string" ? body.last_event : "",
    queue_length:
      typeof body.queue_length === "number" ? body.queue_length : 0,
    updated_at: new Date().toISOString(),
  };

  const { error: upsertError } = await supabase
    .from("bot_status")
    .upsert(statusUpdate, { onConflict: "bot_id" });

  if (upsertError) {
    return new Response(JSON.stringify({ error: upsertError.message }), {
      status: 500,
    });
  }

  // Optional: the agent includes this after a successful restock so
  // the dashboard's live feed reflects real listings, not fixtures.
  const restockEvent = body.restock_event as
    | { item_name?: string; price?: number; rap?: number; price_basis?: string }
    | undefined;

  if (restockEvent && typeof restockEvent.item_name === "string") {
    await supabase.from("restock_events").insert({
      bot_id: bot.id,
      item_name: restockEvent.item_name,
      price: restockEvent.price ?? null,
      rap: restockEvent.rap ?? null,
      price_basis: restockEvent.price_basis ?? null,
    });
  }

  return new Response(
    JSON.stringify({ ok: true, markup_percent: bot.markup_percent }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});
