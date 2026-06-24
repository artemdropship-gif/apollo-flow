# Apollo-Flow — Roadmap

Staged delivery. Each stage is completed fully before the next begins.

| Stage | Scope | Status |
| --- | --- | --- |
| **0** | Scaffold: Next.js 15 App Router, TS, Tailwind v4, shadcn/ui (Base Nova), Prisma + Neon, Better Auth, Zustand, TanStack Query, theme (light/dark), app shell (sidebar + topbar), command palette (Cmd/Ctrl+K), toasts, auth pages, placeholder pages for all sections, error boundaries, seed/demo data, infra docs | ✅ Done |
| **1** | Dashboard: metrics + charts (Recharts), skeleton loading, empty states | ✅ Done |
| **2** | Leads Finder: city + niche input → maps search → activity check → AI audit → Lead Score (formula in `lib/audit/website.ts`) → lead cards → message generation (Telegram/WhatsApp/cold email/proposal) → statuses & comments | ⏳ Planned |
| **3** | CRM Pipeline: Kanban board over leads (NEW/IN_PROGRESS/CONTACTED/REPLIED/NEGOTIATION/CLIENT/REJECTED) | ⏳ Planned |
| **4** | Workflow Builder: React Flow canvas + AI architecture assistant | ⏳ Planned |
| **5** | Project Vault: AES-256-GCM encrypted secrets, links, prompts, export (PDF/Markdown/JSON) | ⏳ Planned |
| **6** | Notes: markdown editor, tags, folders, pinning, autosave (5s) | ⏳ Planned |
| **7** | Onboarding, richer demo data, logging, backups, polish | ⏳ Planned |

## Lead Score formula (reference)

```
+40  no website
+25  outdated design
+20  non-responsive design
+20  few reviews (<20)
+15  poor SEO
+15  inactive socials
+10  broken website
-20  modern website detected
-30  premium website (modern + responsive + good SEO + forms + <2.5s load)
clamp to [0, 100]
```

Implemented in `lib/audit/website.ts` (`computeLeadScore`).

## Stage 1 — Dashboard (delivered)

- `lib/dashboard.ts` — `getDashboardMetrics(userId)`: totals (leads / active projects / clients / conversion %), lead counts by status, 14-day timeline (leads found + messages sent), recent notes & workflows. All queries scoped to the current user.
- `features/dashboard/components/` — `stat-cards.tsx`, `dashboard-charts.tsx` (Recharts area + bar, client), `recent-lists.tsx`, `dashboard-skeleton.tsx`.
- `app/(app)/dashboard/page.tsx` — server component, `Suspense` boundary with skeleton fallback; empty state when the user has no leads.
- `app/(app)/dashboard/loading.tsx` — route-level skeleton during navigation.
- Seed (`prisma/seed.ts`) expanded to 14 leads back-dated across the last 14 days + `ContactMessage` records, so the timeline/funnel charts render meaningful data.
