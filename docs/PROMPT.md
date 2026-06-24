# Apollo-Flow — Original System Prompt

This is the original product brief / system prompt that defines Apollo-Flow. It
is the source of truth for scope and intent. Implementation progress against it
is tracked in [`ROADMAP.md`](./ROADMAP.md); access/infra is mapped in
[`INFRA.md`](./INFRA.md).

> **Secrets are NOT stored in this repo.** This repository is public. API keys
> (e.g. `OPENROUTER_API_KEY`) live only in environment variables / the Devin
> secrets store. See [`INFRA.md`](./INFRA.md) for how to obtain each value.

---

## Role

Act simultaneously as a Senior Fullstack Engineer, Senior UX Designer, AI
Architect, and Product Manager.

Build a modern web application called **Apollo-Flow**.

**Product goal:** help a web developer find potential clients, design project
architecture, and store all working information in one place.

---

## Core principles

- Maximally modern UI. Style: **Linear + Notion + Vercel**. Should look like a
  professional SaaS product.
- Light and dark theme support.
- Fully responsive design.
- UX first.
- All data saved automatically.
- Use local storage + database.

---

## Tech stack

**Frontend:** Next.js 15 App Router, React, TypeScript, TailwindCSS, shadcn/ui,
Framer Motion, React Flow (architecture builder), Zustand, TanStack Query.

**Backend:** Next.js API Routes, Prisma ORM, PostgreSQL.

**Authentication:** Clerk or Better Auth.

**File storage:** UploadThing.

**PDF:** react-pdf, pdf-lib.

**Site parsing:** Playwright, Cheerio.

**Business search:** Google Maps, Yandex Maps, 2GIS, OpenStreetMap.

**AI:** Use **exclusively free models**.
- Primary: Gemini 2.5 Flash Free (or Gemini 2.5 Flash Lite).
- Fallbacks: DeepSeek Chat, Qwen 3, Llama 3.3.
- AI must connect via **OpenRouter**.

---

## Product structure

Sections: Dashboard, Leads Finder, Workflow Builder, Project Vault, Notes,
Settings.

### 1. Leads Finder (core feature)

User inputs a Russian city and a business niche. Example niches: Салон красоты,
Барбершоп, Маникюрный салон, Косметология, Магазин духов, Цветочный магазин,
Автосервис, Стоматология, Кафе, Ресторан, Пиццерия, Фитнес клуб, Юрист,
Недвижимость, Частная клиника, Детский центр, Школа, Отель, SPA, Магазин одежды.
Custom niche entry must also be possible.

After search the system must:

**Step 1 — Find companies** via Google Maps, Yandex Maps, 2GIS. For each
business get: name, address, phone, email, website, rating, reviews count,
working hours, coordinates.

**Step 2 — Check the business is active.** AI determines: is the company
operating now, is it closed, how long since info was updated, are socials
active, does the website work. If the site does not open → assign high priority.

**Step 3 — Automatic audit.** AI analyzes the website: no site, outdated design,
poor mobile version, low speed, no CTA, no lead forms, poor structure, no SEO. If
there is no site → assign very high priority.

**Step 4 — Compute LEAD SCORE.** Formula:

```
+40  no website
+25  outdated design
+20  non-responsive design
+20  few reviews
+15  poor SEO
+15  inactive socials
+10  broken website
-20  new modern website
-30  premium-level website
```

Then output **TOP LEADS**. Business card contains: name, rating, phone, email,
website, address, lead score, AI recommendations, reasons for the high score.

For each business generate: Telegram message, WhatsApp message, cold email,
commercial proposal — AI personalizes the text.

User can: save lead, add to favorites, mark as contacted, mark as client, leave
a comment, set status. Statuses: Новый, В работе, Написал, Ответил, Переговоры,
Клиент, Отказ.

### 2. Workflow Builder

Interactive project-architecture builder using React Flow. Block types:
Frontend, Backend, API, Database, AI, Authentication, Payments, Storage,
Integrations, Deployment. Support: drag and drop, arrow connections, color
groups, zoom, minimap, grouping. Each block has: name, description, notes, task
list, technical decisions.

Add an **AI Assistant**: user describes an idea, AI builds the architecture
automatically (e.g. "CRM for dentistry" → Frontend → Backend → Database → AI
notifications → Payments). AI should also: suggest a stack, find weak spots,
recommend improvements.

### 3. Project Vault

Per-project storage. Project contains:
- Main info: name, description, client, deadline.
- Access: Github, Vercel, Railway, Supabase, Cloudflare, domains, API keys,
  tokens, prompts. **All secrets stored encrypted (AES encryption).**
- Useful links: documentation, references, Figma, articles.
- Prompts: Claude / Cursor / Gemini prompts.
- Export project to PDF / Markdown / JSON, including architecture, notes,
  access, links, tasks, prompts — so the document can be sent to Claude.

### 4. Notes

Full note system: markdown editor, tags, search, pinning, folders, favorites.
Support code blocks, checklists, images, tables. Autosave every 5 seconds.

### 5. Dashboard

Main panel. Show: leads count, active projects, clients, recent notes, recent
workflows, conversion statistics. Charts: leads found, messages sent, replies,
clients.

---

## UI requirements

Use: glassmorphism, smooth animations, skeleton loading, command palette, global
search, keyboard shortcuts. Mandatory: Cmd/Ctrl + K, drag and drop, toast
notifications.

## Folder structure

`/app /components /features /lib /hooks /services /store /prisma /types /utils`.
Each module fully isolated. Feature-first architecture.

## Database

Prisma schema for: User, Project, Workflow, WorkflowNode, Lead, Note,
ContactMessage, VaultItem, Prompt, Activity.

## Additional

Create: onboarding, demo data, empty states, seed script, error boundaries,
logging, backup system.

## Claude working mode

Work in iterations. Before development: design the whole architecture, show the
file structure, create a roadmap, split the project into stages. After
confirmation, start writing code. Never generate everything at once. Each stage
must be fully completed before moving to the next.

## Recommended extra module

**CRM Pipeline** — view all found clients as a Kanban board (like Apollo.io or
Trello). This significantly increases the product's value.
