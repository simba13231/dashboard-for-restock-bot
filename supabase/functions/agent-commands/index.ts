// Edge function: the local Python agent polls this every few seconds
// to pick up commands queued from the dashboard (pause/resume/set
// markup). Same per-bot key auth as agent-report. Commands are marked
// delivered the moment they're returned — best-effort at-most-once,
// which is fine here since a missed "pause" just gets caught by the
// next poll a few seconds later.
//
// Deploy with: supabase functions deploy agent-commands

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
  if (req.method !== "GET") {
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
    .select("id")
    .eq("agent_key_hash", keyHash)
    .maybeSingle();

  if (botError || !bot) {
    return new Response(JSON.stringify({ error: "Invalid agent key" }), {
      status: 401,
    });
  }

  const { data: pending, error: pendingError } = await supabase
    .from("commands")
    .select("id, type, payload, created_at")
    .eq("bot_id", bot.id)
    .is("delivered_at", null)
    .order("created_at", { ascending: true })
    .limit(20);

  if (pendingError) {
    return new Response(JSON.stringify({ error: pendingError.message }), {
      status: 500,
    });
  }

  if (pending && pending.length > 0) {
    const ids = pending.map((c) => c.id);
    await supabase
      .from("commands")
      .update({ delivered_at: new Date().toISOString() })
      .in("id", ids);
  }

  return new Response(JSON.stringify({ commands: pending ?? [] }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
