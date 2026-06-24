# Apollo-Flow — Infrastructure & Access Map

This document maps **where** every piece of infrastructure lives and **how** to
obtain or rotate each secret. It intentionally contains **no secret values** —
real values live in environment variables (`.env`, never committed) and in the
Devin secrets store (org scope). Use this file to bootstrap a new session,
machine, or account purely from the repository.

> BUKETNAYA is a **separate, unrelated** project. Apollo-Flow has its own repo,
> its own Neon project, and its own credentials. Nothing here touches BUKETNAYA.

---

## 1. Source code

| Item | Value |
| --- | --- |
| GitHub repo | https://github.com/artemdropship-gif/apollo-flow |
| Owner | `artemdropship-gif` |
| Default branch | `main` |
| Stage 0 branch | `devin/1782326617-apollo-flow` |

Clone with plain HTTPS (auth handled by the environment):

```bash
git clone https://github.com/artemdropship-gif/apollo-flow.git
```

---

## 2. Database — Neon PostgreSQL

A dedicated Neon project was created for Apollo-Flow (isolated from BUKETNAYA).

| Item | Value |
| --- | --- |
| Provider | Neon (https://neon.tech) |
| Project name | `apollo-flow` |
| Project ID | `odd-cherry-66226802` |
| Branch | `br-quiet-haze-ahpgx5ga` |
| Database | `neondb` |
| Env var | `DATABASE_URL` |

**How to get the connection string:** Neon Console → project `apollo-flow` →
Dashboard → Connection string → choose the **Pooled** connection. Paste it into
`DATABASE_URL` in `.env`.

**How to rotate:** Neon Console → Roles → reset password for `neondb_owner`, then
update `DATABASE_URL` everywhere it is used.

Apply schema / run migrations:

```bash
npm run prisma:generate   # generate client
npm run prisma:push       # push schema to DB (dev)
npm run prisma:seed       # load demo data
```

---

## 3. Authentication — Better Auth (self-hosted)

No third-party auth provider. Auth is fully self-hosted via
[`better-auth`](https://better-auth.com), so it is **not tied to any external
account**. Sessions are cookie-based; the API lives at `/api/auth/[...all]`.

| Env var | Purpose | How to obtain |
| --- | --- | --- |
| `BETTER_AUTH_SECRET` | Signs sessions/tokens | `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | App base URL | e.g. `http://localhost:3000` |
| `NEXT_PUBLIC_APP_URL` | Public base URL | same as above |

**Rotate:** regenerate `BETTER_AUTH_SECRET` (invalidates existing sessions).

---

## 4. Project Vault encryption

Secrets stored in the in-app Project Vault are encrypted at rest with
**AES-256-GCM**. The key is a 32-byte hex string.

| Env var | Purpose | How to obtain |
| --- | --- | --- |
| `VAULT_ENCRYPTION_KEY` | AES-256-GCM key (64 hex chars) | `openssl rand -hex 32` |

**Warning:** rotating this key makes previously stored vault secrets
undecryptable. Plan a re-encryption migration before rotating in production.

---

## 5. AI — OpenRouter (free models)

AI features (audit reasoning, message generation, workflow assistant) call
**OpenRouter** using free models only. If no key is set, the app falls back to a
built-in heuristic (no external calls), so it still runs without a key.

| Env var | Purpose |
| --- | --- |
| `OPENROUTER_API_KEY` | OpenRouter API key |
| `OPENROUTER_MODEL` | Primary model (default `google/gemini-2.0-flash-exp:free`) |

**How to get a key:** https://openrouter.ai/keys → Create Key. Free models
include Gemini 2.5 Flash (Free), DeepSeek Chat, Qwen, Llama 3.3. Fallback model
order is configured in `lib/ai/openrouter.ts`.

---

## 6. Maps / business search

OpenStreetMap (Overpass + Nominatim) is the default provider and requires **no
key**. Additional providers are pluggable and disabled until a key is supplied.

| Env var | Provider | Required? |
| --- | --- | --- |
| — | OpenStreetMap (Overpass/Nominatim) | Default, no key |
| `GOOGLE_MAPS_API_KEY` | Google Maps | Optional |
| `YANDEX_MAPS_API_KEY` | Yandex Maps | Optional |
| `TWOGIS_API_KEY` | 2GIS | Optional |

---

## 7. Hosting (planned)

Not yet deployed. Target host: Vercel. When set up, record the Vercel project,
team, and any deployment env vars here.

---

## 8. Local setup checklist

```bash
cp .env.example .env          # then fill values per sections above
npm install
npm run prisma:generate
npm run prisma:push
npm run prisma:seed           # optional demo data
npm run dev                   # http://localhost:3000
```

Demo login (after seeding): `demo@apollo-flow.local` / `Demo123!`
