"use client";

import { motion } from "framer-motion";

import { shimmer } from "@/lib/motion";
import { Skeleton } from "@/components/ui/skeleton";

export default function SearchLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-6 py-8">
      <div className="space-y-3">
        <Skeleton className="h-10 w-full max-w-xl rounded-xl" />
        <Skeleton className="h-9 w-2/3 rounded-lg" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="relative h-32 overflow-hidden rounded-2xl border border-border-subtle bg-surface-raised/35"
            >
              <motion.div
                variants={shimmer}
                initial="initial"
                animate="animate"
                className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-trust-500/10 to-transparent"
              />
            </div>
          ))}
        </div>
        <div className="relative hidden h-[60vh] overflow-hidden rounded-2xl border border-border-subtle bg-surface-raised/25 lg:block">
          <motion.div
            variants={shimmer}
            initial="initial"
            animate="animate"
            className="absolute inset-y-0 w-2/3 bg-gradient-to-r from-transparent via-text-muted/5 to-transparent"
          />
        </div>
      </div>
    </div>
  );
}
