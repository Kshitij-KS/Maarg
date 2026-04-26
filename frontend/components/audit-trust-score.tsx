"use client";

import { animate } from "framer-motion";
import { useEffect, useRef } from "react";

import { EASE } from "@/lib/motion";
import { formatTrustScore } from "@/lib/format";

export function AuditTrustScoreAnimated({ score }: { score: number }) {
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const controls = animate(0, score, {
      duration: 1.15,
      ease: EASE,
      onUpdate(v) {
        if (ref.current) {
          ref.current.textContent = formatTrustScore(v);
        }
      },
    });
    return () => controls.stop();
  }, [score]);

  return (
    <p ref={ref} className="text-numeric-lg text-trust-600">
      {formatTrustScore(0)}
    </p>
  );
}
