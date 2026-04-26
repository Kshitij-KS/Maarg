"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  ExternalLink,
  FileCheck2,
  Handshake,
  Info,
  LineChart,
  MapPin,
  Route,
  Shield,
  Sparkles,
  Target,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import type { Dashboard, PortalMe, UpdateRequest } from "@/lib/portal-client";
import { cn } from "@/lib/utils";

const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 } as const;

function formatRole(role: string): string {
  return role.replace(/_/g, " ");
}

function formatInTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function requestStatusClass(status: string): string {
  const s = status.toLowerCase();
  if (s === "approved") return "border-success-500/30 bg-success-500/10 text-success-500";
  if (s === "rejected") return "border-danger-500/30 bg-danger-500/10 text-danger-400";
  if (s === "pending" || s === "under_review" || s === "needs_more_info")
    return "border-warn-500/30 bg-warn-500/10 text-warn-600 dark:text-warn-400";
  return "border-border-default bg-surface-overlay text-text-secondary";
}

type OrganizationDashboardProps = {
  data: Dashboard;
  me: PortalMe | null | undefined;
  onSignOut: () => void;
};

function TrustRing({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value));
  const deg = (v / 100) * 360;
  return (
    <div
      className="relative h-32 w-32 shrink-0 md:h-36 md:w-36"
      style={{
        background: `conic-gradient(from -90deg, var(--color-trust-500) 0deg ${deg}deg, var(--color-surface-elevated) ${deg}deg 360deg)`,
        borderRadius: "50%",
        padding: "4px",
      }}
    >
      <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-surface-raised text-center">
        <span className="font-mono text-4xl font-semibold text-trust-500 tabular-nums md:text-5xl">{v}</span>
        <span className="text-eyebrow text-text-muted">index</span>
      </div>
    </div>
  );
}

function CapabilityRow({ cap }: { cap: Dashboard["capabilities"][number] }) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4 transition-shadow hover:shadow-sm",
        cap.claim_present
          ? "border-border-subtle bg-surface-raised/60"
          : "border-dashed border-border-default bg-surface-base/30",
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="font-medium text-text-primary">{cap.label}</p>
          <p className="text-sm text-text-secondary">{cap.explanation}</p>
        </div>
        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
          <Badge variant="secondary" className="w-fit">
            {cap.status_label}
          </Badge>
          <div className="h-1.5 w-full min-w-[140px] overflow-hidden rounded-full bg-surface-elevated sm:max-w-[200px]">
            <div
              className="h-full rounded-full bg-trust-500 transition-all"
              style={{ width: `${Math.min(100, Math.max(0, cap.trust_score_percent))}%` }}
            />
          </div>
          <p className="text-right font-mono text-mono-data text-sm text-text-muted">
            {cap.trust_score_percent}/100
          </p>
        </div>
      </div>
      {cap.citation_sentence ? (
        <blockquote className="mt-3 rounded-lg border border-border-subtle border-l-4 border-l-trust-400/50 bg-surface-elevated/30 p-3 text-sm leading-relaxed text-text-secondary">
          &ldquo;{cap.citation_sentence}&rdquo;
        </blockquote>
      ) : null}
      {cap.plain_english_flags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {cap.plain_english_flags.map((f) => (
            <span
              key={f}
              className="inline-flex items-center gap-1 rounded-full bg-trust-500/10 px-2 py-0.5 text-xs text-text-secondary"
            >
              <Info className="h-3 w-3 text-trust-500" />
              {f}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function UpdateRequestItem({ r }: { r: UpdateRequest }) {
  return (
    <div
      className={cn("rounded-xl border p-3", requestStatusClass(r.status))}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-text-primary">{r.field_name}</span>
        <span className="text-xs uppercase tracking-wider opacity-80">{r.status.replace(/_/g, " ")}</span>
      </div>
      <p className="mt-1 text-xs text-text-muted/90">Submitted {formatInTime(r.submitted_at)}</p>
      {r.new_value ? (
        <p className="mt-2 line-clamp-2 text-sm text-text-secondary">Proposed: {r.new_value}</p>
      ) : null}
      {r.reviewer_notes ? (
        <p className="mt-2 text-sm text-text-secondary">Note: {r.reviewer_notes}</p>
      ) : null}
    </div>
  );
}

export function OrganizationDashboard({ data, me, onSignOut }: OrganizationDashboardProps) {
  const org = me?.organization;
  const displayName = me?.user?.display_name?.trim() || me?.user?.email;
  const sortedSuggestions = [...data.improvement_suggestions].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  );
  const sortedCapabilities = [...data.capabilities].sort(
    (a, b) => a.trust_score_percent - b.trust_score_percent,
  );
  const openRequests = data.update_requests.filter((r) => {
    const s = r.status.toLowerCase();
    return s === "pending" || s === "under_review" || s === "needs_more_info";
  });
  const claimedCount = data.capabilities.filter((c) => c.claim_present).length;
  const auditUrl = `/audit/${data.facility_id}`;

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      {/* Partnership vision hero */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-3xl border border-trust-500/20 bg-gradient-to-br from-trust-500/10 via-surface-raised to-surface-elevated/30 p-6 sm:p-8"
      >
        <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-trust-400/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-trust-500/25 bg-surface-raised/80 px-3 py-1 text-xs font-medium text-trust-200">
                <Handshake className="h-3.5 w-3.5" />
                Maarg partner program
              </span>
              {org?.status ? (
                <Badge variant="outline" className="border-success-500/30 text-success-500">
                  {org.status}
                </Badge>
              ) : null}
            </div>
            <h1 className="text-balance text-3xl font-semibold leading-tight tracking-tight text-text-primary sm:text-4xl">
              {data.facility_name}
            </h1>
            <p className="max-w-2xl text-pretty text-sm leading-relaxed text-text-secondary sm:text-base">
              This dashboard shows exactly how Maarg represents your facility to the public: trust scores, capability
              lines, and citation-backed context. We don&rsquo;t just audit data — we work <strong>with you</strong> to
              close the loop: evidence-backed corrections become training signal, improving the map and search for
              everyone in your care catchment.
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-muted">
              {org ? (
                <span className="inline-flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 shrink-0" />
                  {org.name}
                </span>
              ) : null}
              {me?.user ? (
                <span>
                  {formatRole(me.user.role)} · {displayName}
                </span>
              ) : null}
            </div>
            <p className="text-xs text-text-muted">
              Facility ID <span className="font-mono text-mono-data text-text-secondary">{data.facility_id}</span> ·
              Data snapshot {formatInTime(data.last_updated)}
            </p>
          </div>
          <div className="flex flex-col items-center gap-4 sm:flex-row lg:flex-col">
            <TrustRing value={data.trust_score_percent} />
            <p className="max-w-[200px] text-center text-xs text-text-muted lg:text-left">
              Composite trust index shown to patients in search, audit pages, and partner surfaces.
            </p>
          </div>
        </div>
        <div className="relative mt-6 flex flex-col gap-3 border-t border-border-subtle/80 pt-6 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/portal/updates/new" className="inline-flex items-center gap-2">
                <FileCheck2 className="h-4 w-4" />
                Request a correction
                <ArrowRight className="h-4 w-4 opacity-80" />
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href={auditUrl} className="inline-flex items-center gap-2" target="_blank" rel="noopener noreferrer">
                <Shield className="h-4 w-4" />
                Public audit view
                <ExternalLink className="h-3.5 w-3.5 opacity-70" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/map" className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                See desert map
              </Link>
            </Button>
          </div>
          <Button type="button" variant="ghost" onClick={onSignOut} className="self-start text-text-secondary sm:self-center">
            Log out
          </Button>
        </div>
      </motion.section>

      {/* At-a-glance stats */}
      <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Key metrics">
        {[
          {
            label: "Capabilities tracked",
            value: data.capabilities.length,
            sub: `${claimedCount} with active claims`,
            icon: LineChart,
          },
          {
            label: "Open correction queue",
            value: openRequests.length,
            sub: "Awaiting review or info",
            icon: ClipboardList,
          },
          {
            label: "Total submissions",
            value: data.update_requests.length,
            sub: "All time",
            icon: FileCheck2,
          },
          {
            label: "Improvement focus areas",
            value: sortedSuggestions.length,
            sub: "Prioritized below",
            icon: Target,
          },
        ].map((m) => (
          <Card key={m.label} className="border-border-subtle">
            <CardContent className="flex gap-3 pt-5">
              <m.icon className="mt-0.5 h-5 w-5 shrink-0 text-trust-500" />
              <div>
                <p className="text-eyebrow text-text-muted">{m.label}</p>
                <p className="mt-0.5 font-mono text-2xl text-text-primary tabular-nums">{m.value}</p>
                <p className="text-xs text-text-muted">{m.sub}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <section aria-labelledby="cap-heading">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 id="cap-heading" className="text-h3 text-text-primary">
                  Trust by capability
                </h2>
                <p className="text-sm text-text-secondary">
                  Sorted with the largest gaps first so you can prioritize evidence.
                </p>
              </div>
            </div>
            <div className="space-y-3">
              {sortedCapabilities.map((c) => (
                <CapabilityRow key={c.capability} cap={c} />
              ))}
              {data.capabilities.length === 0 ? (
                <p className="text-sm text-text-muted">No capabilities are exposed for this facility yet.</p>
              ) : null}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <Card className="border-trust-500/15">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-4 w-4 text-trust-500" />
                Facility snapshot
              </CardTitle>
              <CardDescription>What Maarg currently indexes for you.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-text-secondary">
              <p>
                <span className="text-text-muted">PIN</span> {data.pin_code}
              </p>
              <p>
                <span className="text-text-muted">District</span> {data.district}
              </p>
              <p>
                <span className="text-text-muted">State</span> {data.state}
              </p>
              <p>
                <span className="text-text-muted">Type</span> {data.facility_type}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Route className="h-4 w-4 text-text-muted" />
                Partner next steps
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-text-secondary">
              <p className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success-500" />
                Use <strong className="text-text-primary">Request a correction</strong> for structured,
                reviewable changes — with photo proof when required.
              </p>
              <p className="flex gap-2">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-trust-500" />
                Check the <strong className="text-text-primary">public audit</strong> page to see what patients and
                referrers see.
              </p>
              <Separator className="my-1" />
              <Link
                className="inline-flex items-center gap-1 text-sm font-medium text-trust-200 hover:underline"
                href="/#partner-ecosystem"
              >
                Why we partner with hospitals
                <ChevronRight className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>
        </aside>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="updates-heading">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle id="updates-heading">Your update requests</CardTitle>
                  <CardDescription>Transparency on every field-level submission.</CardDescription>
                </div>
                <Button asChild size="sm" variant="secondary">
                  <Link href="/portal/updates/new">New request</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {data.update_requests.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border-default p-6 text-center">
                  <p className="text-sm text-text-secondary">
                    No corrections submitted yet. When something in your profile or equipment list is wrong, start a
                    request — you&rsquo;ll get status updates as reviewers work through the queue.
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[min(28rem,50vh)] pr-2">
                  <ul className="space-y-3">
                    {data.update_requests.map((r) => (
                      <li key={r.request_id}>
                        <UpdateRequestItem r={r} />
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </section>

        <section aria-labelledby="improve-heading">
          <Card>
            <CardHeader>
              <CardTitle id="improve-heading">Ways to strengthen your record</CardTitle>
              <CardDescription>
                Concrete actions aligned with the audit pipeline. High-impact items first.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sortedSuggestions.length === 0 ? (
                <div className="flex gap-3 rounded-2xl border border-success-500/20 bg-success-500/5 p-4">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-success-500" />
                  <p className="text-sm text-text-secondary">
                    No open improvement prompts from the latest snapshot. Keep submitting evidence when your facility
                    changes — that is how the network stays current.
                  </p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {sortedSuggestions.map((s) => (
                    <li
                      key={s.title}
                      className={cn(
                        "rounded-xl border p-4",
                        s.severity === "high"
                          ? "border-warn-500/35 bg-warn-500/5"
                          : s.severity === "medium"
                            ? "border-border-default bg-surface-raised/50"
                            : "border-border-subtle bg-surface-base/20",
                      )}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          className={cn(
                            s.severity === "high" && "bg-warn-500/15 text-warn-600 dark:text-warn-400",
                            s.severity === "medium" && "bg-surface-elevated text-text-secondary",
                            s.severity === "low" && "bg-surface-overlay text-text-muted",
                          )}
                        >
                          {s.severity}
                        </Badge>
                        <p className="font-medium text-text-primary">{s.title}</p>
                      </div>
                      <p className="mt-2 text-sm text-text-secondary">{s.description}</p>
                      <div className="mt-3">
                        {s.field_name ? (
                          <Button asChild size="sm" variant="outline" className="w-full sm:w-auto">
                            <Link href={`/portal/updates/new?field=${encodeURIComponent(s.field_name)}`}>
                              Address this in a correction
                              <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        ) : (
                          <Button asChild size="sm" variant="outline" className="w-full sm:w-auto">
                            <Link href="/portal/updates/new">Open correction form</Link>
                          </Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}

export function OrganizationDashboardSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8 sm:px-6 sm:py-10">
      <div className="space-y-4 rounded-3xl border border-border-subtle p-6 sm:p-8">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-10 w-3/4 max-w-md" />
        <Skeleton className="h-20 w-full max-w-2xl" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {["a", "b", "c", "d"].map((k) => (
          <Skeleton key={k} className="h-24 w-full" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}

type ErrorProps = {
  message: string;
  onRetry: () => void;
};

export function OrganizationDashboardError({ message, onRetry }: ErrorProps) {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-4 px-6 py-20 text-center">
      <p className="text-lg font-medium text-text-primary">We couldn&apos;t load your dashboard</p>
      <p className="text-sm text-text-secondary">{message}</p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button type="button" onClick={onRetry}>
          Try again
        </Button>
        <Button asChild type="button" variant="outline">
          <Link href="/portal/login">Back to sign in</Link>
        </Button>
      </div>
    </div>
  );
}
