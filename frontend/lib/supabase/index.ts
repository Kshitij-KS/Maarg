/**
 * App-wide Supabase: browser/server clients, session provider, and auth helpers.
 *
 * - Client: `useSupabase()` or `getBrowserSupabaseClient()` (may be `null` if not configured)
 * - Server: `getServerSupabaseOrNull()` / `getSupabaseUser()` in Server Components and Route Handlers
 */
export {
  isSupabaseConfigured,
  getBrowserSupabaseClient,
  createClient as createSupabaseBrowserClient,
} from "@/utils/supabase/client";
export {
  getServerSupabaseOrNull,
  createClient as createSupabaseServerClient,
  getSupabaseUser,
} from "@/utils/supabase/server";
export { useSupabase, SupabaseProvider } from "@/components/supabase-provider";
