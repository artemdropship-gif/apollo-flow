import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ship docs/BUILD_PROMPT.md with the server bundle so the AI generator can
  // read the Архитектор's working standard at runtime (incl. on Vercel).
  outputFileTracingIncludes: {
    "/**": ["./docs/BUILD_PROMPT.md"],
  },
};

export default nextConfig;
