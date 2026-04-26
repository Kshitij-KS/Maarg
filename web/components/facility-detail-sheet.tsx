"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { animate, motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  Loader2,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Siren,
  Star,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ConfidenceBar } from "@/components/confidence-bar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { findAlternatives, getFacility, getFacilityEvidence } from "@/lib/api";
import { getContact } from "@/lib/facility-contacts";
import { formatTrustScore } from "@/lib/format";
import { EASE, fadeInUp, stagger } from "@/lib/motion";
import { useUIStore } from "@/lib/stores/use-ui-store";
import {
  CAPABILITY_LABELS,
  type Capability,
  type CapabilityClaim,
  type FacilityEvidenceResponse,
  type FacilityTrustRecord,
} from "@/lib/types";
import { cn } from "@/lib/utils";

function TrustBadge({ score }: { score: number }) {
  const color =
    score >= 0.8
      ? "border-success-500/30 bg-success-500/10 text-success-500"
      : score >= 0.5
        ? "border-warn-500/30 bg-warn-500/10 text-warn-400"
        : "border-danger-500/30 bg-danger-500/10 text-danger-400";
  return (
    <span className={cn("rounded-full border px-2.5 py-0.5 font-mono text-mono-data", color)}>
      {formatTrustScore(score)}
    </span>
  );
}

function AnimatedTrustValue({ value }: { value: number }) {
  const spanRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const controls = animate(0, value, {
      duration: 0.9,
      ease: EASE,
      onUpdate(v) {
        if (spanRef.current) {
          spanRef.current.textContent = formatTrustScore(v);
        }
      },
    });
    return () => controls.stop();
  }, [value]);
  return (
    <span ref={spanRef} className="text-numeric-lg text-text-primary">
      {formatTrustScore(value)}
    </span>
  );
}

function CapabilityRow({ claim }: { claim: CapabilityClaim }) {
  const [expanded, setExpanded] = useState(false);
  const flagged = (claim.flags ?? []).length > 0;
  const label =
    CAPABILITY_LABELS[claim.capability as Capability] ?? claim.capability;

  return (
    <motion.div
      variants={fadeInUp}
      className={cn(
        "rounded-2xl border p-4",
        flagged
          ? "border-warn-400/30 bg-warn-glow"
          : claim.claim_present
            ? "border-border-subtle bg-surface-raised/60"
            : "border-border-subtle bg-surface-base/30",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {flagged ? (
            <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warn-400" />
          ) : claim.claim_present ? (
            <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-success-500" />
          ) : (
            <span className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full border border-border-strong" />
          )}
          <span className="text-small font-medium text-text-primary">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <TrustBadge score={claim.trust_score} />
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-text-muted transition-colors hover:text-text-primary"
            aria-label={expanded ? "Collapse" : "Expand citations"}
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      <div className="mt-3">
        <ConfidenceBar
          low={claim.confidence_interval_low}
          point={claim.trust_score}
          high={claim.confidence_interval_high}
          glow={claim.claim_present && !flagged}
        />
      </div>

      {/* Signal bars */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        {(
          [
            ["Self-consistency", claim.self_consistency_score],
            ["Coherence", claim.coherence_score],
            ["Peer anomaly", claim.peer_anomaly_score],
          ] as [string, number][]
        ).map(([label, val]) => (
          <div key={label} className="flex flex-col gap-1">
            <span className="text-eyebrow text-text-muted">{label}</span>
            <div className="h-1 overflow-hidden rounded-full bg-border-default">
              <motion.div
                className={cn("h-full rounded-full", flagged ? "bg-warn-500" : "bg-trust-500")}
                initial={{ width: 0 }}
                animate={{ width: `${val * 100}%` }}
                transition={{ duration: 0.7, ease: EASE }}
              />
            </div>
            <span className="font-mono text-[10px] text-text-muted">{val.toFixed(2)}</span>
          </div>
        ))}
      </div>

      {/* Flags */}
      {flagged && (
        <div className="mt-2 flex flex-wrap gap-1">
          {(claim.flags ?? []).map((flag) => (
            <span
              key={flag}
              className="rounded-full border border-warn-400/30 bg-warn-glow px-2 py-0.5 font-mono text-[10px] text-warn-200"
            >
              {flag}
            </span>
          ))}
        </div>
      )}

      {/* Citations (collapsible) */}
      <AnimatePresence>
        {expanded && claim.citations.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-2 border-t border-border-subtle pt-3">
              <p className="text-eyebrow text-text-muted">Citations</p>
              {claim.citations.map((cit, i) => (
                <blockquote
                  key={i}
                  className="rounded-xl border-l-2 border-trust-400/40 bg-surface-base/40 py-2 pl-3 pr-2 font-mono text-[11px] text-text-secondary italic"
                >
                  &ldquo;{cit.sentence}&rdquo;
                  <footer className="mt-1 not-italic text-text-muted">
                    — {cit.source_field}
                  </footer>
                </blockquote>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function AlternativeCard({
  facility,
  onSelect,
}: {
  facility: FacilityTrustRecord;
  onSelect: () => void;
}) {
  return (
    <motion.button
      variants={fadeInUp}
      type="button"
      onClick={onSelect}
      whileHover={{ x: 4 }}
      transition={{ type: "spring", stiffness: 500, damping: 26 }}
      className="group w-full rounded-xl border border-border-default bg-surface-raised/50 p-3 text-left transition-colors hover:border-trust-400/40 hover:bg-trust-glow"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-small font-medium text-text-primary">{facility.facility_name}</p>
          <p className="mt-0.5 text-eyebrow text-text-muted">
            {facility.district}, {facility.state}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TrustBadge score={facility.overall_trust_score} />
          <ArrowUpRight
            size={14}
            className="text-text-muted transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-trust-400"
          />
        </div>
      </div>
    </motion.button>
  );
}

function FacilitySheetContent({
  facility,
  evidence,
}: {
  facility: FacilityTrustRecord;
  evidence?: FacilityEvidenceResponse;
}) {
  const contact = getContact(facility.facility_id);
  const [altOpen, setAltOpen] = useState(false);
  const openFacility = useUIStore((s) => s.openFacility);

  const capabilities = facility.capabilities.map((c) => c.capability);

  const { mutate: fetchAlternatives, data: altData, isPending: altLoading } = useMutation({
    mutationFn: () =>
      findAlternatives({
        lat: facility.lat,
        lon: facility.lon,
        capabilities,
        facilityName: facility.facility_name,
        excludeFacilityId: facility.facility_id,
      }),
  });

  const handleFetchAlt = () => {
    if (!altData) fetchAlternatives();
    setAltOpen((v) => !v);
  };

  const alternatives = altData?.candidates.filter(
    (c) => c.facility_id !== facility.facility_id,
  ) ?? [];

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Header */}
      <div className="shrink-0 border-b border-border-default bg-surface-raised/50 px-6 py-5 backdrop-blur">
        <div className="flex items-start justify-between gap-4 pr-8">
          <div>
            <div className="flex items-center gap-2">
              <Building2 size={16} className="text-trust-400" />
              <span className="text-eyebrow text-trust-200">{facility.facility_type}</span>
            </div>
            <h2 className="mt-1 text-h2 text-text-primary">{facility.facility_name}</h2>
            <p className="mt-1 text-small text-text-muted">
              {facility.district}, {facility.state} · PIN {facility.pin_code}
            </p>
          </div>
          <AnimatedTrustValue value={facility.overall_trust_score} />
        </div>

        {/* Trust bar */}
        <div className="mt-4">
          <p className="mb-2 text-eyebrow text-text-muted">Overall trust score</p>
          <div className="h-2 overflow-hidden rounded-full bg-border-default">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-trust-600 to-trust-400"
              initial={{ width: 0 }}
              animate={{ width: `${facility.overall_trust_score * 100}%` }}
              transition={{ duration: 1, ease: EASE }}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-6 px-6 py-5">
        {evidence ? (
          <motion.section variants={fadeInUp} initial="hidden" animate="visible">
            <p className="mb-3 text-eyebrow text-text-muted">Evidence verdict</p>
            <div
              className={cn(
                "rounded-2xl border p-4",
                evidence.has_flags
                  ? "border-warn-400/30 bg-warn-glow"
                  : "border-trust-400/20 bg-trust-glow",
              )}
            >
              <p className="text-body text-text-primary">{evidence.audit_summary}</p>
              {evidence.flag_summary ? (
                <p className="mt-2 text-small text-warn-200">{evidence.flag_summary}</p>
              ) : null}
              {evidence.evidence.length > 0 ? (
                <blockquote className="mt-3 rounded-xl border-l-2 border-trust-400/40 bg-surface-base/40 py-2 pl-3 pr-2 font-mono text-[11px] text-text-secondary italic">
                  &ldquo;{evidence.evidence[0].sentence}&rdquo;
                  <footer className="mt-1 not-italic text-text-muted">
                    {CAPABILITY_LABELS[evidence.evidence[0].capability as Capability] ??
                      evidence.evidence[0].capability}{" "}
                    · {evidence.evidence[0].source_field}
                  </footer>
                </blockquote>
              ) : null}
            </div>
          </motion.section>
        ) : null}

        {/* Contact card */}
        {contact && (
          <motion.section variants={fadeInUp} initial="hidden" animate="visible">
            <p className="mb-3 text-eyebrow text-text-muted">Contact & access</p>
            <div className="space-y-2 rounded-2xl border border-border-default bg-surface-raised/60 p-4">
              {contact.address && (
                <div className="flex items-start gap-3">
                  <MapPin size={14} className="mt-0.5 shrink-0 text-trust-400" />
                  <span className="text-small text-text-secondary">{contact.address}</span>
                </div>
              )}
              {contact.phone && (
                <div className="flex items-center gap-3">
                  <Phone size={14} className="shrink-0 text-text-muted" />
                  <a
                    href={`tel:${contact.phone}`}
                    className="font-mono text-mono-data text-trust-200 hover:underline"
                  >
                    {contact.phone}
                  </a>
                </div>
              )}
              {contact.ambulance && (
                <div className="flex items-center gap-3">
                  <Siren size={14} className="shrink-0 text-danger-400" />
                  <a
                    href={`tel:${contact.ambulance}`}
                    className="font-mono text-mono-data text-danger-400 hover:underline"
                  >
                    {contact.ambulance}
                    <span className="ml-2 text-text-muted">(Ambulance)</span>
                  </a>
                </div>
              )}
              {contact.emergency && (
                <div className="flex items-center gap-3">
                  <Siren size={14} className="shrink-0 text-danger-400" />
                  <span className="font-mono text-mono-data text-danger-400">
                    {contact.emergency} — National Emergency
                  </span>
                </div>
              )}
              {contact.email && (
                <div className="flex items-center gap-3">
                  <Mail size={14} className="shrink-0 text-text-muted" />
                  <a
                    href={`mailto:${contact.email}`}
                    className="font-mono text-mono-data text-text-secondary hover:text-trust-200"
                  >
                    {contact.email}
                  </a>
                </div>
              )}
              {contact.operating_hours && (
                <div className="flex items-start gap-3">
                  <Clock size={14} className="mt-0.5 shrink-0 text-text-muted" />
                  <span className="text-small text-text-secondary">{contact.operating_hours}</span>
                </div>
              )}
              {contact.directions_url && (
                <div className="mt-2 flex gap-2">
                  <a
                    href={contact.directions_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-trust-400/30 bg-trust-glow px-3 py-1.5 text-small text-trust-200 transition-colors hover:border-trust-400/60"
                  >
                    <ExternalLink size={12} aria-hidden />
                    Get directions
                  </a>
                </div>
              )}
            </div>
          </motion.section>
        )}

        <Separator className="border-border-subtle" />

        {/* Capabilities */}
        <section>
          <p className="mb-3 text-eyebrow text-text-muted">
            Capability audit ({facility.capabilities.length} claims)
          </p>
          <motion.div
            variants={stagger(0.06)}
            initial="hidden"
            animate="visible"
            className="space-y-3"
          >
            {facility.capabilities.map((claim) => (
              <CapabilityRow key={claim.capability} claim={claim} />
            ))}
          </motion.div>
        </section>

        <Separator className="border-border-subtle" />

        {/* Agentic alternatives */}
        <section>
          <button
            type="button"
            onClick={handleFetchAlt}
            className="group flex w-full items-center justify-between rounded-2xl border border-border-default bg-surface-raised/60 px-4 py-3 transition-colors hover:border-trust-400/40 hover:bg-trust-glow"
          >
            <div className="flex items-center gap-2.5">
              <Zap size={15} className="text-trust-400" />
              <span className="text-small font-medium text-text-primary">
                Maarg: find verified alternatives nearby
              </span>
              {altLoading && <Loader2 size={13} className="animate-spin text-trust-400" />}
            </div>
            {altOpen ? (
              <ChevronUp size={14} className="text-text-muted" />
            ) : (
              <ChevronDown size={14} className="text-text-muted" />
            )}
          </button>

          <AnimatePresence>
            {altOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="mt-3 space-y-2">
                  {altLoading && (
                    <div className="flex items-center gap-2 rounded-xl bg-surface-raised/40 px-4 py-3">
                      <Loader2 size={14} className="animate-spin text-trust-400" />
                      <span className="text-small text-text-muted">
                        Reasoning pipeline running…
                      </span>
                    </div>
                  )}
                  {alternatives.length === 0 && !altLoading && altData && (
                    <p className="rounded-xl bg-surface-raised/40 px-4 py-3 text-small text-text-muted">
                      No other facilities found within 150 km.
                    </p>
                  )}
                  <motion.div
                    variants={stagger(0.05)}
                    initial="hidden"
                    animate="visible"
                    className="space-y-2"
                  >
                    {alternatives.slice(0, 4).map((alt) => (
                      <AlternativeCard
                        key={alt.facility_id}
                        facility={alt}
                        onSelect={() => openFacility(alt.facility_id)}
                      />
                    ))}
                  </motion.div>
                  {altData && (
                    <div className="flex items-center gap-2 rounded-xl border border-border-subtle bg-surface-base/30 px-3 py-2">
                      <ShieldCheck size={12} className="text-trust-400" />
                      <span className="font-mono text-[11px] text-text-muted">
                        Ranked by Truth Engine · trace {altData.trace_id.slice(0, 10)}
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Metadata */}
        <section className="rounded-2xl border border-border-subtle bg-surface-base/30 px-4 py-3">
          <p className="text-eyebrow text-text-muted">Audit metadata</p>
          <div className="mt-2 flex flex-wrap gap-3">
            <div>
              <span className="text-eyebrow text-text-muted">Last updated</span>
              <p className="font-mono text-mono-data text-text-secondary">
                {new Date(facility.last_updated).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
            <div>
              <span className="text-eyebrow text-text-muted">Extraction runs</span>
              <p className="font-mono text-mono-data text-text-secondary">
                {facility.extraction_run_ids.length}
              </p>
            </div>
            <div>
              <span className="text-eyebrow text-text-muted">Facility ID</span>
              <p className="font-mono text-mono-data text-text-secondary">
                {facility.facility_id}
              </p>
            </div>
          </div>
        </section>

        <div className="pb-4">
          <a
            href={`/audit/${facility.facility_id}`}
            className="inline-flex items-center gap-2 rounded-full border border-trust-400/30 bg-trust-glow px-5 py-2.5 text-small text-trust-200 transition-colors hover:border-trust-400/60 hover:bg-trust-400/15"
          >
            <Star size={14} aria-hidden />
            Full Maarg audit
            <ArrowUpRight size={14} aria-hidden />
          </a>
        </div>
      </div>
    </div>
  );
}

export function FacilityDetailSheet() {
  const activeFacilityId = useUIStore((s) => s.activeFacilityId);
  const sheetOpen = useUIStore((s) => s.sheetOpen);
  const setSheetOpen = useUIStore((s) => s.setSheetOpen);

  const { data: facility } = useQuery({
    queryKey: ["facility", activeFacilityId],
    queryFn: () => getFacility(activeFacilityId!),
    enabled: activeFacilityId != null,
    staleTime: 60_000,
  });
  const { data: evidence } = useQuery({
    queryKey: ["facility-evidence", activeFacilityId],
    queryFn: () => getFacilityEvidence(activeFacilityId!),
    enabled: activeFacilityId != null,
    staleTime: 60_000,
  });

  return (
    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
      <SheetContent
        side="right"
        className="w-full overflow-hidden border-l border-border-default bg-surface-base p-0 sm:max-w-xl"
        showCloseButton
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Facility details</SheetTitle>
          <SheetDescription>
            Contact information, capability audit, and citations for the selected facility.
          </SheetDescription>
        </SheetHeader>
        {facility ? (
          <FacilitySheetContent facility={facility} evidence={evidence} />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Loader2 size={24} className="animate-spin text-trust-400" />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
