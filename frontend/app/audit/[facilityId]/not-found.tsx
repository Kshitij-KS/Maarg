import Link from "next/link";
import { ArrowLeft, FileQuestion } from "lucide-react";

import { Badge } from "@/components/ui/badge";

export default function FacilityNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <div className="glass-panel hairline-top w-full rounded-3xl p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-border-subtle bg-surface-raised/70 text-text-secondary">
          <FileQuestion size={24} aria-hidden />
        </div>
        <Badge
          variant="outline"
          className="mt-5 border-border-strong font-mono text-mono-data"
        >
          404
        </Badge>
        <h1 className="mt-3 text-h1 text-text-primary">Facility not found</h1>
        <p className="mt-3 text-body text-text-secondary">
          We couldn&rsquo;t find an audit record for this facility ID. It may have been
          renamed, removed, or the URL was mistyped.
        </p>
        <Link
          href="/search"
          className="mt-6 inline-flex items-center gap-2 rounded-full border border-border-strong bg-surface-raised/70 px-5 py-2 text-small text-text-primary transition-colors hover:bg-surface-raised"
        >
          <ArrowLeft size={14} aria-hidden />
          Back to search
        </Link>
      </div>
    </main>
  );
}
