"use client";

import { motion } from "framer-motion";

const POINTS = [
  { left: "12%", top: "18%", delay: 0.1, size: 5 },
  { left: "20%", top: "66%", delay: 0.9, size: 4 },
  { left: "34%", top: "28%", delay: 1.4, size: 6 },
  { left: "48%", top: "72%", delay: 0.4, size: 5 },
  { left: "62%", top: "22%", delay: 1.8, size: 4 },
  { left: "72%", top: "58%", delay: 0.7, size: 6 },
  { left: "86%", top: "34%", delay: 1.2, size: 5 },
] as const;

const ROUTES = [
  "M95 370 C210 260 270 120 430 180 C575 238 650 120 804 80",
  "M120 445 C270 375 280 270 442 292 C620 316 626 208 796 178",
  "M54 250 C174 210 240 330 380 286 C530 238 594 330 738 270",
] as const;

export function LandingBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-x-[-12%] top-0 h-72 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.72),transparent_66%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(230,91,42,0.08),transparent_68%)]" />

      <motion.div
        className="heat-bloom absolute inset-x-[16%] bottom-[-14rem] h-[36rem] opacity-70"
        animate={{ scale: [1, 1.06, 1], opacity: [0.46, 0.68, 0.46] }}
        transition={{ duration: 9.5, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="absolute -left-24 top-10 h-72 w-72 rounded-full border border-trust-500/14"
        animate={{ rotate: 360, scale: [1, 1.05, 1] }}
        transition={{ rotate: { duration: 38, repeat: Infinity, ease: "linear" }, scale: { duration: 7, repeat: Infinity } }}
      />
      <motion.div
        className="absolute right-[-5rem] top-20 h-96 w-96 rounded-full border border-warn-500/14"
        animate={{ rotate: -360, scale: [1, 0.96, 1] }}
        transition={{ rotate: { duration: 46, repeat: Infinity, ease: "linear" }, scale: { duration: 9, repeat: Infinity } }}
      />

      <svg
        className="absolute inset-x-0 top-[9%] h-[58%] w-full text-trust-500/35"
        viewBox="0 0 900 520"
        fill="none"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="route-gradient" x1="0" y1="0" x2="900" y2="0">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
            <stop offset="40%" stopColor="currentColor" stopOpacity="0.55" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ROUTES.map((route, index) => (
          <motion.path
            key={route}
            d={route}
            stroke="url(#route-gradient)"
            strokeWidth={index === 1 ? 1.7 : 1.1}
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: [0, 1, 1], opacity: [0, 0.7, 0.18] }}
            transition={{
              duration: 5.8,
              repeat: Infinity,
              repeatDelay: 1.2 + index * 0.4,
              delay: index * 0.55,
              ease: "easeInOut",
            }}
          />
        ))}
      </svg>

      <motion.div
        className="absolute inset-y-0 left-1/3 w-px bg-gradient-to-b from-transparent via-trust-500/25 to-transparent"
        animate={{ x: ["-18vw", "46vw"], opacity: [0, 0.9, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="absolute left-[50%] top-[58%] h-11 w-11 -translate-x-1/2 rotate-45 border border-trust-500/25 bg-surface-raised/25 shadow-glow-trust backdrop-blur-sm"
        animate={{ scale: [1, 1.08, 1], opacity: [0.42, 0.7, 0.42] }}
        transition={{ duration: 5.4, repeat: Infinity, ease: "easeInOut" }}
      >
        <span className="absolute inset-[10px] border border-trust-500/30" />
      </motion.div>

      {POINTS.map((point) => (
        <motion.span
          key={`${point.left}-${point.top}`}
          className="absolute rounded-full bg-trust-500 shadow-glow-trust"
          style={{
            left: point.left,
            top: point.top,
            width: point.size,
            height: point.size,
          }}
          animate={{
            y: [0, -10, 0],
            scale: [1, 1.65, 1],
            opacity: [0.35, 0.92, 0.35],
          }}
          transition={{
            duration: 4.2,
            delay: point.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-surface-base to-transparent" />
    </div>
  );
}
