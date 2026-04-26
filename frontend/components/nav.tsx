"use client";

import { motion } from "framer-motion";
import { Moon, SunMedium } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

const NAV_TABS: {
  href: string;
  label: string;
  isActive: (pathname: string) => boolean;
}[] = [
  {
    href: "/#partner-ecosystem",
    label: "Partners",
    isActive: (p) => p === "/" || p.startsWith("/portal"),
  },
  {
    href: "/search",
    label: "Search",
    isActive: (p) => p === "/search" || p.startsWith("/audit"),
  },
  {
    href: "/map",
    label: "Map",
    isActive: (p) => p === "/map" || p.startsWith("/map/"),
  },
];

type Theme = "light" | "dark";

export function Nav() {
  const pathname = usePathname();
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
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
    <nav className="sticky top-0 z-30 border-b border-border-subtle bg-surface-base/80 backdrop-blur-2xl">
      <div className="mx-auto flex min-h-14 w-full max-w-7xl items-center gap-2 px-4 py-2 sm:min-h-[60px] sm:gap-3 sm:px-6 sm:py-0">
        {/* Wordmark — fixed width, never squashes */}
        <Link
          href="/"
          className="group flex shrink-0 items-center gap-2 text-text-primary sm:gap-2.5"
        >
          <motion.span
            aria-hidden
            className="relative block h-5 w-5 rotate-45 bg-text-primary shadow-card"
            whileHover={{ scale: 1.15, rotate: 90 }}
            transition={{ type: "spring", stiffness: 600, damping: 22 }}
          >
            <span className="absolute inset-[3px] bg-trust-500/90" />
          </motion.span>
          <span className="text-h3 font-semibold tracking-[-0.03em]">Maarg</span>
          <span className="hidden font-mono text-[10px] tracking-widest text-text-muted md:inline">
            मार्ग
          </span>
        </Link>

        {/* Center: partners + main nav — true center between logo and theme */}
        <div className="flex min-w-0 flex-1 items-center justify-center">
          <div className="flex max-w-full shrink-0 items-center gap-0.5 overflow-x-auto rounded-full border border-border-default bg-surface-overlay p-0.5 text-xs shadow-card [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-1 sm:p-1 sm:text-sm [&::-webkit-scrollbar]:hidden">
            {NAV_TABS.map((tab) => {
              const active = tab.isActive(pathname);
              return (
                <Link
                  key={tab.label}
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative z-0 shrink-0 whitespace-nowrap rounded-full px-2.5 py-1.5 sm:px-3.5 sm:py-1.5",
                    active ? "text-text-primary" : "text-text-secondary hover:text-text-primary",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-active-pill"
                      className="absolute inset-0 -z-10 rounded-full bg-surface-raised shadow-card"
                      transition={{ type: "spring", stiffness: 540, damping: 38 }}
                    />
                  )}
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Theme — fixed width */}
        <div className="flex shrink-0 items-center">
          <motion.button
            type="button"
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            aria-pressed={theme === "dark"}
            onClick={toggleTheme}
            whileTap={{ scale: 0.92, rotate: 20 }}
            transition={{ type: "spring", stiffness: 600, damping: 18 }}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border-default bg-surface-overlay text-text-muted transition-colors hover:text-text-primary"
          >
            {theme === "dark" ? <SunMedium size={15} aria-hidden /> : <Moon size={15} aria-hidden />}
          </motion.button>
        </div>
      </div>
    </nav>
  );
}
