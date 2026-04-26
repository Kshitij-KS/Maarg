import { ConfidenceBar } from "@/components/confidence-bar";
import { Badge } from "@/components/ui/badge";
import { getFacilityEvidence } from "@/lib/api";
import { formatConfidenceInterval, formatTrustScore } from "@/lib/format";
import { CAPABILITY_LABELS, type Capability } from "@/lib/types";
import { cn } from "@/lib/utils";

export default async function AuditPage({
  params,
}: {
  params: Promise<{ facilityId: string }>;
}) {
  const { facilityId } = await params;
  const evidence = await getFacilityEvidence(facilityId);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-6 py-8">
      <div className="glass-panel hairline-top rounded-3xl p-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <p className="text-eyebrow text-trust-200">Facility evidence audit</p>
            <h1 className="mt-2 text-h1 text-text-primary">{evidence.facility_name}</h1>
            <p className="mt-2 text-body text-text-secondary">
              {evidence.district}, {evidence.state} · PIN {evidence.pin_code} ·{" "}
              {evidence.facility_type}
            </p>
          </div>
          <div className="rounded-2xl border border-border-subtle bg-surface-raised/70 px-5 py-4">
            <p className="text-eyebrow text-text-muted">Overall trust</p>
            <p className="text-numeric-lg text-trust-600">
              {formatTrustScore(evidence.overall_trust_score)}
            </p>
          </div>
        </div>

        <div
          className={cn(
            "mt-6 rounded-2xl border p-4",
            evidence.has_flags
              ? "border-warn-400/30 bg-warn-glow"
              : "border-trust-400/20 bg-trust-glow",
          )}
        >
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                "font-mono text-mono-data",
                evidence.has_flags
                  ? "border-warn-400/35 text-warn-200"
                  : "border-trust-400/30 text-trust-200",
              )}
            >
              {evidence.has_flags ? "FLAGGED" : "SUPPORTED"}
            </Badge>
            {evidence.flags.map((flag) => (
              <span
                key={flag}
                className="rounded-full border border-warn-400/30 bg-surface-base/35 px-2 py-0.5 font-mono text-[10px] text-warn-200"
              >
                {flag}
              </span>
            ))}
          </div>
          <p className="mt-3 text-body text-text-primary">{evidence.audit_summary}</p>
          {evidence.flag_summary ? (
            <p className="mt-2 text-small text-warn-200">{evidence.flag_summary}</p>
          ) : null}
      </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-2">
        {evidence.signals.map((signal) => {
          const flagged = signal.flags.length > 0;
          const label =
            CAPABILITY_LABELS[signal.capability as Capability] ?? signal.capability;
          return (
            <article
              key={signal.capability}
              className={cn(
                "glass-panel rounded-2xl border p-5",
                flagged ? "border-warn-400/30" : "border-border-default",
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-h3 text-text-primary">{label}</h2>
                  <p className="mt-1 text-small text-text-muted">
                    {signal.citation_count} citation{signal.citation_count === 1 ? "" : "s"} · CI{" "}
                    {formatConfidenceInterval(
                      signal.confidence_interval_low,
                      signal.confidence_interval_high,
                    )}
                  </p>
                </div>
                <span className="rounded-full border border-border-subtle bg-surface-raised/70 px-3 py-1 font-mono text-mono-data text-text-primary">
                  {formatTrustScore(signal.trust_score)}
                </span>
              </div>
              <ConfidenceBar
                low={signal.confidence_interval_low}
                point={signal.trust_score}
                high={signal.confidence_interval_high}
                glow={!flagged && signal.claim_present}
                className="mt-4"
              />
              <div className="mt-4 grid grid-cols-3 gap-2">
                {[
                  ["Self-consistency", signal.self_consistency_score],
                  ["Coherence", signal.coherence_score],
                  ["Peer anomaly", signal.peer_anomaly_score],
                ].map(([name, value]) => (
                  <div
                    key={name}
                    className="rounded-xl border border-border-subtle bg-surface-base/30 p-3"
                  >
                    <p className="text-eyebrow text-text-muted">{name}</p>
                    <p className="mt-1 font-mono text-mono-data text-text-secondary">
                      {(value as number).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
              {flagged ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {signal.flags.map((flag) => (
                    <span
                      key={flag}
                      className="rounded-full border border-warn-400/30 bg-warn-glow px-2 py-0.5 font-mono text-[10px] text-warn-200"
                    >
                      {flag}
                    </span>
                  ))}
                </div>
              ) : null}
            </article>
          );
        })}
      </section>

      <section className="glass-panel rounded-3xl p-5">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-eyebrow text-text-muted">Citation snippets</p>
            <h2 className="mt-1 text-h2 text-text-primary">Evidence behind the score</h2>
          </div>
          <Badge variant="outline" className="border-border-strong font-mono text-mono-data">
            {evidence.evidence.length} snippets
          </Badge>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {evidence.evidence.map((snippet, index) => (
            <blockquote
              key={`${snippet.capability}-${snippet.source_field}-${index}`}
              className={cn(
                "rounded-2xl border-l-2 bg-surface-base/35 p-4 font-mono text-[12px] text-text-secondary italic",
                snippet.flags.length > 0 ? "border-warn-400/60" : "border-trust-400/40",
              )}
            >
              &ldquo;{snippet.sentence}&rdquo;
              <footer className="mt-3 flex flex-wrap items-center gap-2 not-italic text-text-muted">
                <span>
                  {CAPABILITY_LABELS[snippet.capability as Capability] ?? snippet.capability}
                </span>
                <span>·</span>
                <span>{snippet.source_field}</span>
              </footer>
            </blockquote>
          ))}
        </div>
      </section>
    </main>
  );
}
