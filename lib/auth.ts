import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/db";

// Desktop app runs on a fixed localhost port; trust both host spellings so
// sign-in works in the Electron window. The website's own origin
// (BETTER_AUTH_URL) is trusted automatically.
const DESKTOP_PORT = process.env.APOLLO_DESKTOP_PORT || "34117";
const desktopOrigins = [
  `http://localhost:${DESKTOP_PORT}`,
  `http://127.0.0.1:${DESKTOP_PORT}`,
];

export const auth = betterAuth({
  trustedOrigins: desktopOrigins,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  plugins: [nextCookies()],
});

export type Auth = typeof auth;
