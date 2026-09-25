import { createClient } from "@supabase/supabase-js";

// These are the PUBLIC project URL + anon key — safe to ship in a
// frontend bundle. All real access control happens via Row Level
// Security policies in the database (see supabase/migrations), not by
// keeping these secret. Never put the service role key here.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  // Fails loudly at build/boot instead of silently returning a client
  // that 404s on every request — much faster to debug a deploy.
  throw new Error(
    "Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY env vars. " +
      "Set them in your Vercel/Netlify project settings.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// The base URL for the two edge functions, shown to the user during
// onboarding so their local agent knows where to send its reports.
export const FUNCTIONS_URL = `${supabaseUrl.replace(
  ".supabase.co",
  ".functions.supabase.co",
)}`;

/** SHA-256 hex digest, used to hash a freshly generated agent key
 * before it's stored — the raw key is shown to the user exactly once
 * and never persisted anywhere in plaintext. */
export async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** A random 40-character key, generated entirely client-side. */
export function generateAgentKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(30));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
