import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const here = path.dirname(fileURLToPath(import.meta.url));

/**
 * Lock tracing to *this* app directory. If a parent folder (e.g. user home) has
 * another package-lock.json, Next may pick the wrong root and webpack chunks break at runtime
 * (e.g. "Cannot find module './611.js'").
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: here,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "webpersona-dev.vercel.app" },
    ],
  },
};

export default nextConfig;
