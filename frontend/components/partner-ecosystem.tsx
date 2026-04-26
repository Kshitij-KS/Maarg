"use client";

import Link from "next/link";
import { Building2, Handshake, Stethoscope } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LINK = {
  signIn: "/portal/login",
  register: "/portal/register",
} as const;

type Pillar = {
  title: string;
  description: string;
  icon: typeof Building2;
  ariaLabel: string;
};

const PILLARS: Pillar[] = [
  {
    title: "Hospitals & health systems",
    description:
      "Multi-site networks and hospitals keeping facility profiles, capabilities, and evidence aligned for statewide maps.",
    icon: Building2,
    ariaLabel: "Partner options for hospitals and health systems",
  },
  {
    title: "Clinics & independent practices",
    description:
      "Single sites, polyclinics, and nursing homes joining verified coverage and correction workflows.",
    icon: Stethoscope,
    ariaLabel: "Partner options for clinics and practices",
  },
];

export function PartnerEcosystemCta({ className }: { className?: string }) {
  return (
    <section
      id="partner-ecosystem"
      aria-labelledby="partner-ecosystem-heading"
      className={cn("scroll-mt-24", className)}
    >
      <div className="glass-panel hairline-top relative overflow-hidden rounded-3xl border border-border-default p-6 sm:p-8">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-trust-500/8 blur-3xl" />
        <div className="relative">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl border border-trust-500/25 bg-trust-500/10 text-trust-600">
                <Handshake size={20} aria-hidden />
              </span>
              <div>
                <h2
                  id="partner-ecosystem-heading"
                  className="text-h2 text-balance text-text-primary"
                >
                  Partner ecosystem
                </h2>
                <p className="mt-2 max-w-2xl text-body text-text-secondary">
                  Maarg grows with verified organizations. Hospitals, networks, and clinics use the
                  same portal to register, update records with evidence, and stay aligned with
                  the public map — a shared layer of trust, not a one-off form.
                </p>
              </div>
            </div>
          </div>

          <ul className="mt-8 grid gap-4 md:grid-cols-2">
            {PILLARS.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <li
                  key={pillar.title}
                  className="flex flex-col rounded-2xl border border-border-subtle bg-surface-raised/50 p-5 shadow-sm"
                >
                  <div className="flex items-center gap-2.5 text-text-primary">
                    <Icon className="shrink-0 text-trust-500" size={20} aria-hidden />
                    <h3 className="text-h3 text-balance">{pillar.title}</h3>
                  </div>
                  <p className="mt-2 flex-1 text-small text-text-secondary">{pillar.description}</p>
                  <div
                    className="mt-5 flex flex-wrap items-center gap-2"
                    role="group"
                    aria-label={pillar.ariaLabel}
                  >
                    <Button
                      asChild
                      size="default"
                      className="h-9 rounded-full bg-text-primary text-surface-raised hover:bg-trust-600"
                    >
                      <Link href={LINK.signIn}>Sign in</Link>
                    </Button>
                    <Button asChild variant="outline" size="default" className="h-9 rounded-full">
                      <Link href={LINK.register}>Register</Link>
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mt-6 rounded-2xl border border-border-subtle bg-surface-base/40 px-4 py-4 sm:px-5">
            <p className="text-small text-text-primary">
              <span className="font-medium">Want to register with us — or explore a partnership?</span>{" "}
              Start with organization registration. Already onboarded? Sign in to your dashboard. For
              data, integration, or research collaborations, use the same registration flow and
              we&apos;ll route you to the right team.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Compact line for the hero — links to #partner-ecosystem on the home page.
 */
export function PartnerEcosystemTeaser() {
  return (
    <p className="max-w-2xl text-small leading-relaxed text-text-secondary">
      <span className="text-text-primary/90">Run a company, hospital, or clinic? </span>
      <Link
        href="/#partner-ecosystem"
        className="font-medium text-trust-600 underline decoration-trust-500/35 underline-offset-2 transition-colors hover:decoration-trust-500"
      >
        Join the partner ecosystem
      </Link>
      <span> — sign in, register, or ask how we can work together.</span>
    </p>
  );
}
