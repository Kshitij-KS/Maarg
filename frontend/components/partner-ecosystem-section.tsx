"use client";

import { motion } from "framer-motion";
import { ArrowRight, Building2, Handshake, HelpCircle, Stethoscope } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { fadeInUp } from "@/lib/motion";
import { cn } from "@/lib/utils";

type PartnerCardProps = {
  title: string;
  subtitle: string;
  icon: typeof Building2;
  className?: string;
};

function PartnerCard({ title, subtitle, icon: Icon, className }: PartnerCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border border-border-default bg-surface-raised/50 p-5 shadow-sm",
        className,
      )}
    >
      <div className="mb-3 flex items-center gap-2 text-text-primary">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-border-subtle bg-surface-overlay">
          <Icon size={18} className="text-trust-600" aria-hidden />
        </span>
        <div>
          <h3 className="text-h3 leading-tight">{title}</h3>
          <p className="mt-0.5 text-small text-text-muted">{subtitle}</p>
        </div>
      </div>
      <p className="mb-4 flex-1 text-body text-text-secondary">
        Use the organization portal to verify your listing, submit evidence-backed updates, and track
        review status — same trusted pipeline for networks and individual sites.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" className="rounded-full" asChild>
          <Link href="/portal/login">
            Sign in
            <ArrowRight size={14} className="opacity-80" aria-hidden />
          </Link>
        </Button>
        <Button size="sm" variant="outline" className="rounded-full" asChild>
          <Link href="/portal/register">Register</Link>
        </Button>
      </div>
    </div>
  );
}

export function PartnerEcosystemSection() {
  return (
    <motion.section
      id="partner-ecosystem"
      variants={fadeInUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-40px" }}
      className="relative mt-20 w-full scroll-mt-24"
      aria-labelledby="partner-ecosystem-heading"
    >
      <div className="glass-panel hairline-top rounded-3xl border border-border-default p-6 sm:p-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-eyebrow text-trust-600">
              <Handshake size={15} aria-hidden />
              Partner ecosystem
            </div>
            <h2 id="partner-ecosystem-heading" className="text-h1 text-text-primary">
              Built with hospitals, clinics, and networks
            </h2>
            <p className="max-w-2xl text-body text-text-secondary">
              Maarg works best when verified organizations sit on the same map as patients and auditors.
              Whether you run a multi-hospital system or a single clinic, you can claim your record,
              correct claims with citations, and stay in sync with the truth layer.
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <PartnerCard
            title="Hospitals & health systems"
            subtitle="Networks, chains, and multi-site providers"
            icon={Building2}
          />
          <PartnerCard
            title="Clinics & practices"
            subtitle="Single sites, nursing homes, and specialty centers"
            icon={Stethoscope}
          />
        </div>

        <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-border-subtle bg-surface-base/40 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2 text-small text-text-secondary sm:items-center">
            <HelpCircle size={16} className="mt-0.5 shrink-0 text-trust-500" aria-hidden />
            <span>
              <span className="font-medium text-text-primary">Have a question or exploring a research partnership? </span>
              We&apos;re building the partner program openly — start with registration or reach out from your
              organization email when you sign in.
            </span>
          </p>
          <Button variant="outline" size="sm" className="shrink-0 rounded-full" asChild>
            <Link href="/portal/register">Register with us</Link>
          </Button>
        </div>
      </div>
    </motion.section>
  );
}
