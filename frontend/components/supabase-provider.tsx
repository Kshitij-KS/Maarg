"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getBrowserSupabaseClient } from "@/utils/supabase/client";

type SupabaseContextValue = {
  supabase: SupabaseClient | null;
  user: User | null;
  session: Session | null;
  /** False until the first `getSession` / `onAuthStateChange` callback when Supabase is configured. */
  isReady: boolean;
};

const SupabaseContext = createContext<SupabaseContextValue | undefined>(undefined);

/**
 * Wires the browser Supabase client and `auth` session for all Client Components.
 * When env vars are missing, `supabase` is `null` and `isReady` is true immediately.
 */
export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => getBrowserSupabaseClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setIsReady(true);
      return;
    }
    let cancel = false;
    void supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (cancel) return;
      setSession(s);
      setUser(s?.user ?? null);
      setIsReady(true);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });
    return () => {
      cancel = true;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const value = useMemo<SupabaseContextValue>(
    () => ({ supabase, user, session, isReady }),
    [supabase, user, session, isReady],
  );
  return <SupabaseContext.Provider value={value}>{children}</SupabaseContext.Provider>;
}

export function useSupabase(): SupabaseContextValue {
  const ctx = useContext(SupabaseContext);
  if (ctx === undefined) {
    throw new Error("useSupabase must be used within SupabaseProvider");
  }
  return ctx;
}
