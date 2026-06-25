# Apollo-Flow Desktop — Test Report

**Build:** Windows installer `Apollo-Flow-Setup-0.1.0.exe` (NSIS), built on a
`windows-latest` GitHub Actions runner.
**What was tested:** the actual **packaged** Electron app (`isPackaged = true`,
bundled Prisma query engine + node_modules), launched as a native window with an
embedded Next.js production server. Same code that ships in the `.exe`.

## Result: all checks passed, no bugs

| # | Test | Result |
|---|------|--------|
| 1 | App launches, embedded server boots, native window opens | PASS |
| 2 | Sign-in (Better Auth + Prisma → Neon) inside the desktop window | PASS |
| 3 | Dashboard loads live data (metrics, funnel, recent workflows) | PASS |
| 4 | Leads Finder: 6 saved leads, temperature badges, score, filters | PASS |
| 5 | CRM Pipeline: kanban renders cards across status columns | PASS |
| 6 | Workflow Builder: opens a saved architecture (canvas + edges + minimap) | PASS |
| 7 | Project brief (ТЗ) panel shows суть / цель / страницы / дизайн | PASS |
| 8 | Export "Текст для Claude": strict instruction + brief + JSON round-trip schema | PASS |
| 9 | AI assistant streams a relevant answer via the free OpenRouter model chain | PASS |
| 10 | `tsc --noEmit`, `eslint`, `next build` all green | PASS |

## Notes / fixes made during testing

- **Auth origin:** auth client now uses the live `window.location.origin` and the
  server trusts the desktop localhost origin, so sign-in works in the desktop
  window on its dynamic port (and unchanged on the web).
- **Packaging bug caught & fixed:** `electron-builder` strips `node_modules` from
  `extraResources`, which would have shipped a broken `.exe` (no Prisma engine).
  An `afterPack` hook now restores the standalone `node_modules` (incl. the
  Windows query engine) into the packaged resources. Verified the packed app
  runs and queries the database.
- **First-run config:** if `DATABASE_URL` is not set, the app writes a template
  config file, opens its folder, and tells the user where to put credentials —
  no secrets are baked into the public installer.

## Distribution

- Installer: `Apollo-Flow-Setup-0.1.0.exe` (~236 MB) — GitHub Release `v0.1.0`.
- Windows query engine (`query_engine-windows.dll.node`) is bundled, so the
  database works out of the box on Windows.
