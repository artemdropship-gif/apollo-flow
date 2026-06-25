"use client";

import { createAuthClient } from "better-auth/react";

// The auth API (`/api/auth/*`) is always served from the same origin as the
// app. Using the live origin keeps auth working regardless of the host/port —
// the website on Vercel and the desktop app (dynamic localhost port) alike.
// Falls back to the env var only during SSR where `window` is unavailable.
const baseURL =
  typeof window !== "undefined"
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL;

export const authClient = createAuthClient({
  baseURL,
});

export const { signIn, signUp, signOut, useSession } = authClient;
