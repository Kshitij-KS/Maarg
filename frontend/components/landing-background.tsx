"use client";

/**
 * Calm hero backdrop: soft gradients and static shapes only (no parallax,
 * no looping route animations, no cursor tracking).
 */
export function LandingBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <div className="absolute inset-x-[-12%] top-0 h-72 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.72),transparent_66%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(230,91,42,0.08),transparent_68%)]" />

      <div className="heat-bloom pointer-events-none absolute inset-x-[16%] bottom-[-14rem] h-[36rem] opacity-50" />

      <div className="absolute -left-24 top-10 h-72 w-72 rounded-full border border-trust-500/10" />
      <div className="absolute right-[-5rem] top-20 h-96 w-96 rounded-full border border-warn-500/10" />

      <svg
        className="absolute inset-x-0 top-[9%] h-[58%] w-full text-trust-500/25"
        viewBox="0 0 900 520"
        fill="none"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="route-gradient" x1="0" y1="0" x2="900" y2="0">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
            <stop offset="40%" stopColor="currentColor" stopOpacity="0.4" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[
          "M95 370 C210 260 270 120 430 180 C575 238 650 120 804 80",
          "M120 445 C270 375 280 270 442 292 C620 316 626 208 796 178",
          "M54 250 C174 210 240 330 380 286 C530 238 594 330 738 270",
        ].map((route, index) => (
          <path
            key={route}
            d={route}
            stroke="url(#route-gradient)"
            strokeWidth={index === 1 ? 1.5 : 1.1}
            strokeLinecap="round"
            opacity={0.35}
          />
        ))}
      </svg>

      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-surface-base to-transparent" />
    </div>
  );
}
