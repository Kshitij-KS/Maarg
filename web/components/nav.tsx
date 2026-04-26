"use client";

import { motion } from "framer-motion";
import { Moon, SunMedium } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

const TABS: { href: string; label: string }[] = [
  { href: "/search", label: "Search" },
  { href: "/map", label: "Map" },
];

type Theme = "light" | "dark";

function isActive(pathname: string, href: string): boolean {
  if (href === "/search") {
    return pathname === "/search" || pathname.startsWith("/audit");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Nav() {
  const pathname = usePathname();
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    // Migrate legacy key
    const legacy = window.localStorage.getItem("veritas-theme");
    if (legacy) {
      window.localStorage.setItem("maarg-theme", legacy);
      window.localStorage.removeItem("veritas-theme");
    }
    const saved = window.localStorage.getItem("maarg-theme");
    const initialTheme: Theme = saved === "dark" ? "dark" : "light";
    setTheme(initialTheme);
    document.documentElement.classList.toggle("dark", initialTheme === "dark");
  }, []);

  const toggleTheme = () => {
    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", next === "dark");
      window.localStorage.setItem("maarg-theme", next);
      return next;
    });
  };

  return (
    <nav className="sticky top-0 z-30 border-b border-border-subtle bg-surface-base/72 backdrop-blur-2xl">
      <div className="mx-auto flex h-[60px] w-full max-w-7xl items-center justify-between px-6">
        {/* Wordmark */}
        <Link
          href="/"
          className="group flex items-center gap-2.5 text-text-primary"
        >
          {/* Diamond waypoint logomark */}
          <motion.span
            aria-hidden
            className="relative block h-5 w-5 rotate-45 bg-text-primary shadow-card"
            whileHover={{ scale: 1.2, rotate: 90 }}
            transition={{ type: "spring", stiffness: 600, damping: 22 }}
          >
            <span className="absolute inset-[3px] bg-trust-500/90" />
          </motion.span>
          <span className="text-h3 font-semibold tracking-[-0.03em]">Maarg</span>
          <span className="hidden font-mono text-[10px] tracking-widest text-text-muted sm:inline">
            मार्ग
          </span>
        </Link>

        {/* Tab bar */}
        <div className="hidden items-center gap-1 rounded-full border border-border-default bg-surface-overlay p-1 text-small shadow-card sm:flex">
          {TABS.map((tab) => {
            const active = isActive(pathname, tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative rounded-full px-4 py-1.5 z-0",
                  active ? "text-text-primary" : "text-text-secondary hover:text-text-primary",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="nav-active-pill"
                    className="absolute inset-0 rounded-full bg-surface-raised shadow-card"
                    style={{ zIndex: -1 }}
                    transition={{ type: "spring", stiffness: 540, damping: 38 }}
                  />
                )}
                {tab.label}
              </Link>
            );
          })}
        </div>

        {/* Theme toggle */}
        <div className="flex items-center gap-3">
          <motion.button
            type="button"
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            aria-pressed={theme === "dark"}
            onClick={toggleTheme}
            whileTap={{ scale: 0.88, rotate: 30 }}
            transition={{ type: "spring", stiffness: 600, damping: 18 }}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border-default bg-surface-overlay text-text-muted transition-colors hover:text-text-primary"
          >
            {theme === "dark" ? (
              <SunMedium size={15} aria-hidden />
            ) : (
              <Moon size={15} aria-hidden />
            )}
          </motion.button>
        </div>
      </div>
    </nav>
  );
}
