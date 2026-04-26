import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let browserClient: SupabaseClient | null = null;

/** True when URL and publishable key are set (safe for the browser with RLS). */
export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl?.trim() && supabaseKey?.trim());
}

/**
 * Client Components: returns a shared client, or `null` when env is missing (app still runs).
 */
export function getBrowserSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!browserClient) {
    browserClient = createBrowserClient(supabaseUrl!, supabaseKey!);
  }
  return browserClient;
}

/**
 * Use when the client must exist (after checking `isSupabaseConfigured()`).
 * @throws if Supabase is not configured
 */
export function createClient(): SupabaseClient {
  const c = getBrowserSupabaseClient();
  if (!c) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  }
  return c;
}
