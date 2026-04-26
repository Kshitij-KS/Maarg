import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * @returns `null` if Supabase env vars are not set (e.g. local dev without DB).
 */
export async function getServerSupabaseOrNull(): Promise<SupabaseClient | null> {
  if (!supabaseUrl?.trim() || !supabaseKey?.trim()) return null;
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Component: middleware or Route Handler handles refresh
        }
      },
    },
  });
}

/**
 * Server Components, Server Actions, Route Handlers: `await` this when Supabase is required.
 * @throws if env is missing
 */
export async function createClient(): Promise<SupabaseClient> {
  const c = await getServerSupabaseOrNull();
  if (!c) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  }
  return c;
}

/** Current user from the cookie-backed session, or `null` if not signed in or Supabase is off. */
export async function getSupabaseUser(): Promise<User | null> {
  const supabase = await getServerSupabaseOrNull();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
