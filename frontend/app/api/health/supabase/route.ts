import { NextResponse } from "next/server";

import { getServerSupabaseOrNull } from "@/utils/supabase/server";

/**
 * Quick check: Supabase env + (optional) signed-in user. Does not query your tables.
 * Use to verify the Next.js → Supabase connection in dev.
 */
export async function GET() {
  const supabase = await getServerSupabaseOrNull();
  if (!supabase) {
    return NextResponse.json(
      { ok: true, supabase: "not_configured", message: "Set NEXT_PUBLIC_SUPABASE_URL and publishable key" },
      { status: 200 },
    );
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return NextResponse.json({
    ok: true,
    supabase: "connected",
    authenticated: Boolean(user),
    user_id: user?.id ?? null,
  });
}
