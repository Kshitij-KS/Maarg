"use client";

import { motion } from "framer-motion";

import { shimmer } from "@/lib/motion";

export default function AuditLoading() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-6 py-8">
      <div className="glass-panel hairline-top relative overflow-hidden rounded-3xl p-6">
        <motion.div
          variants={shimmer}
          initial="initial"
          animate="animate"
          className="pointer-events-none absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-trust-500/8 to-transparent"
        />
        <div className="flex flex-col gap-4 lg:flex-row lg:justify-between">
          <div className="space-y-3">
            <div className="h-3 w-32 rounded-full bg-surface-elevated/80" />
            <div className="h-10 w-64 max-w-full rounded-xl bg-surface-elevated/80" />
            <div className="h-4 w-48 rounded-lg bg-surface-elevated/60" />
          </div>
          <div className="h-24 w-40 rounded-2xl border border-border-subtle bg-surface-raised/50" />
        </div>
        <div className="mt-6 h-28 rounded-2xl border border-border-subtle bg-surface-base/40" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="relative h-48 overflow-hidden rounded-2xl border border-border-subtle bg-surface-raised/30"
          >
            <motion.div
              variants={shimmer}
              initial="initial"
              animate="animate"
              className="absolute inset-y-0 w-3/5 bg-gradient-to-r from-transparent via-trust-500/8 to-transparent"
            />
          </div>
        ))}
      </div>
    </main>
  );
}
