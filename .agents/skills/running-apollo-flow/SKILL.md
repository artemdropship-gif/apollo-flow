---
name: running-apollo-flow
description: How to run, seed, and test Apollo-Flow locally — dev server, port/auth gotcha, demo login, and verification commands. Use when setting up or testing the app.
---

# Running & testing Apollo-Flow locally

## Dev server — MUST be port 3000
`npm run dev` starts Next.js (Turbopack). The Better Auth client uses `BETTER_AUTH_URL`/`NEXT_PUBLIC_APP_URL` = `http://localhost:3000`. If port 3000 is occupied, Next falls back to 3001 and **login fails with "Failed to fetch"** because auth calls still go to :3000.

Before starting, free port 3000:
```bash
fuser -k 3000/tcp 2>/dev/null; pkill -f "next dev" 2>/dev/null
cd /home/ubuntu/repos/apollo-flow && PORT=3000 npm run dev
```
(`lsof` is not installed on the VM; use `fuser` / `ss -ltnp`.)

## Demo login
After seeding: `demo@apollo-flow.local` / `Demo123!`. Login lands on `/dashboard` (middleware redirects unauthenticated users to `/login`).

## Database / seed
Postgres is on Neon (project `apollo-flow`, isolated from other projects). Connection string in `.env` (`DATABASE_URL`, not committed). Reseed demo data:
```bash
npm run prisma:seed
```
Seed creates: 14 leads back-dated over 14 days (covers all 7 statuses), 2 projects (1 ACTIVE / 1 PAUSED), 1 CLIENT, 2 notes, 1 workflow (3 nodes), plus ContactMessages — enough to populate dashboard charts.

## Verification commands
```bash
npm run lint
npm run typecheck
npm run build
```
No CI is configured on the repo; verify locally.

## UI library note
This repo uses shadcn/ui **Base Nova** (Base UI), not Radix. Use the `render` prop, NOT `asChild`. Base UI `Menu.GroupLabel` must be inside a `Menu.Group`; cmdk `CommandDialog` must wrap children in `<Command>`.
