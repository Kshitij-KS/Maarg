"use client";

import { motion, useAnimation } from "framer-motion";
import { ArrowRight, Command, Search } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { auroraSpin } from "@/lib/motion";
import { useFiltersStore } from "@/lib/stores/use-filters-store";
import { cn } from "@/lib/utils";

const PLACEHOLDERS = [
  "C-section near Madhepura...",
  "Dialysis evidence at facility F00042...",
  "Emergency obstetric desert PIN 855107...",
];

const DEBOUNCE_MS = 350;

const SHAKE_KEYFRAMES = {
  x: [0, -6, 6, -4, 4, -2, 2, 0],
  transition: { duration: 0.45, ease: [0.4, 0, 0.6, 1] as [number, number, number, number] },
};

export function QueryBar({ className }: { className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const query = useFiltersStore((s) => s.query);
  const setQuery = useFiltersStore((s) => s.setQuery);
  const applyNow = useFiltersStore((s) => s.applyNow);

  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [queryFocused, setQueryFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const formControls = useAnimation();
  const btnControls = useAnimation();

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((i) => (i + 1) % PLACEHOLDERS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    if (query.length === 0) {
      return;
    }
    debounceRef.current = setTimeout(() => {
      applyNow();
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, applyNow]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    if (query.trim().length === 0) {
      // micro-shake the form when submitting empty
      await formControls.start(SHAKE_KEYFRAMES);
      return;
    }
    // pulse the submit button
    await btnControls.start({
      scale: [1, 0.9, 1.06, 1],
      transition: { duration: 0.3, ease: "easeOut" },
    });
    applyNow();
    if (pathname !== "/search") {
      router.push("/search");
    }
  };

  return (
    <motion.div animate={formControls} className={cn("w-full", className)}>
      <form
        className={cn(
          "group relative w-full rounded-full p-[2px] shadow-card transition-all duration-300",
          "focus-within:-translate-y-0.5 focus-within:shadow-popover",
          "bg-[linear-gradient(145deg,rgba(200,70,38,0.12),rgba(36,28,22,0.35))]",
        )}
        onSubmit={handleSubmit}
        role="search"
      >
        <motion.div
          aria-hidden
          variants={auroraSpin}
          initial="rest"
          animate={queryFocused ? "active" : "rest"}
          className={cn(
            "pointer-events-none absolute inset-0 rounded-full transition-opacity duration-300",
            queryFocused ? "opacity-100" : "opacity-0",
          )}
          style={{
            background:
              "conic-gradient(from 120deg, rgba(200,70,38,0.95), rgba(217,146,34,0.65), rgba(72,130,110,0.75), rgba(200,70,38,0.95))",
          }}
        />
        <div
          className={cn(
            "relative flex w-full items-center gap-2 overflow-hidden rounded-full border border-border-default bg-surface-raised/95 px-3 py-2",
            "group-focus-within:border-trust-400/35",
          )}
        >
          <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-trust-glow to-transparent opacity-0 transition-opacity duration-300 group-focus-within:opacity-70" />
          <Search
            size={18}
            className="relative shrink-0 text-text-muted transition-colors group-focus-within:text-trust-500"
            aria-hidden
          />
          <Input
            aria-label="Healthcare facility query"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setQueryFocused(true)}
            onBlur={() => {
              setQueryFocused(false);
              applyNow();
            }}
            placeholder={PLACEHOLDERS[placeholderIndex]}
            className="relative h-10 border-0 bg-transparent font-mono text-[13px] tracking-tight text-text-primary placeholder:text-text-muted/80 focus-visible:ring-0 focus-visible:border-0"
          />
          <span className="hidden items-center gap-1 rounded-lg border border-border-subtle bg-surface-base/45 px-2 py-1 font-mono text-[11px] text-text-muted md:inline-flex">
            <Command size={12} aria-hidden />
            Enter
          </span>
          <motion.div animate={btnControls} className="relative">
            <Button
              type="submit"
              size="sm"
              className="relative h-10 shrink-0 gap-1.5 rounded-full bg-text-primary px-5 text-surface-raised shadow-card hover:bg-trust-600 hover:text-text-on-accent"
            >
              Audit
              <ArrowRight size={14} aria-hidden />
            </Button>
          </motion.div>
        </div>
      </form>
    </motion.div>
  );
}
