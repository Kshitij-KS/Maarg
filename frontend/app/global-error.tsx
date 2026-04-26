"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (typeof console !== "undefined") {
      console.error("[app] global error", error);
    }
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b0d12",
          color: "#e6e8ee",
          fontFamily:
            "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
        }}
      >
        <div
          style={{
            maxWidth: 560,
            padding: 32,
            border: "1px solid rgba(239, 68, 68, 0.35)",
            borderRadius: 24,
            background: "rgba(20, 24, 32, 0.75)",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontFamily:
                "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              fontSize: 12,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#fca5a5",
              margin: 0,
            }}
          >
            Fatal error
          </p>
          <h1 style={{ marginTop: 12, fontSize: 28, lineHeight: 1.2 }}>
            Maarg crashed before it could render.
          </h1>
          <p
            style={{
              marginTop: 12,
              fontSize: 14,
              color: "#9aa3b2",
              wordBreak: "break-word",
            }}
          >
            {error.message}
          </p>
          {error.digest ? (
            <p
              style={{
                marginTop: 8,
                fontFamily:
                  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                fontSize: 12,
                color: "#6b7280",
              }}
            >
              digest: {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 24,
              padding: "10px 20px",
              borderRadius: 999,
              border: "1px solid rgba(45, 212, 220, 0.35)",
              background: "rgba(45, 212, 220, 0.15)",
              color: "#9ef0f6",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
