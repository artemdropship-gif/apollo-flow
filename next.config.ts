import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // "standalone" emits a self-contained server (.next/standalone/server.js)
  // that the Electron desktop shell launches — same full-stack app, no browser.
  // Harmless for the Vercel deploy too.
  output: "standalone",
  // Ship docs/BUILD_PROMPT.md with the server bundle so the AI generator can
  // read the Архитектор's working standard at runtime (incl. on Vercel/desktop).
  outputFileTracingIncludes: {
    "/**": ["./docs/BUILD_PROMPT.md"],
  },
};

export default nextConfig;
