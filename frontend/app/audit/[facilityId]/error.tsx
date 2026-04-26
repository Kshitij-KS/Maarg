"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ArrowLeft, RotateCcw, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";

export default function AuditError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (typeof console !== "undefined") {
      console.error("[audit] route error", error);
    }
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <div className="glass-panel hairline-top w-full rounded-3xl border-l-4 border-l-danger-500 p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-danger-500/30 bg-warn-glow text-danger-400">
          <ShieldAlert size={24} aria-hidden />
        </div>
        <Badge
          variant="outline"
          className="mt-5 border-danger-500/40 font-mono text-mono-data text-danger-400"
        >
          AUDIT ERROR
        </Badge>
        <h1 className="mt-3 text-h1 text-text-primary">
          We couldn&rsquo;t load this audit
        </h1>
        <p className="mt-3 text-body text-text-secondary">{error.message}</p>
        {error.digest ? (
          <p className="mt-2 font-mono text-mono-data text-text-muted">
            digest: {error.digest}
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-full border border-trust-400/30 bg-trust-glow px-5 py-2 text-small text-trust-200 transition-colors hover:bg-trust-glow/80"
          >
            <RotateCcw size={14} aria-hidden />
            Try again
          </button>
          <Link
            href="/search"
            className="inline-flex items-center gap-2 rounded-full border border-border-strong bg-surface-raised/70 px-5 py-2 text-small text-text-primary transition-colors hover:bg-surface-raised"
          >
            <ArrowLeft size={14} aria-hidden />
            Back to search
          </Link>
        </div>
      </div>
    </main>
  );
}
