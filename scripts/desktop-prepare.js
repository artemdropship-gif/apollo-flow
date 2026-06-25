// Assembles the Next.js "standalone" output into a fully self-contained server
// bundle that the Electron shell launches. Runs on Linux (local) and on the
// Windows CI runner identically (uses fs.cpSync, no shell-specific commands).
//
// Steps:
//   1. .next/static  -> .next/standalone/.next/static   (client assets)
//   2. public        -> .next/standalone/public         (static files)
//   3. node_modules/.prisma + @prisma/client engines     (DB works in the .exe)
//   4. .env          -> .next/standalone/.env            (only if present)

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const standalone = path.join(root, ".next", "standalone");

function copyDir(from, to, label) {
  if (!fs.existsSync(from)) {
    console.warn(`[desktop-prepare] skip ${label}: ${from} not found`);
    return;
  }
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.cpSync(from, to, { recursive: true });
  console.log(`[desktop-prepare] copied ${label}`);
}

function copyFile(from, to, label) {
  if (!fs.existsSync(from)) {
    console.warn(`[desktop-prepare] skip ${label}: ${from} not found`);
    return;
  }
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
  console.log(`[desktop-prepare] copied ${label}`);
}

if (!fs.existsSync(standalone)) {
  console.error(
    "[desktop-prepare] .next/standalone not found — run `next build` first " +
      '(needs output: "standalone" in next.config).',
  );
  process.exit(1);
}

copyDir(
  path.join(root, ".next", "static"),
  path.join(standalone, ".next", "static"),
  ".next/static",
);
copyDir(path.join(root, "public"), path.join(standalone, "public"), "public");

// Prisma: the generated client + ALL engine binaries (incl. the Windows
// query engine from binaryTargets) must be present next to the bundled server.
copyDir(
  path.join(root, "node_modules", ".prisma", "client"),
  path.join(standalone, "node_modules", ".prisma", "client"),
  "node_modules/.prisma/client",
);
copyDir(
  path.join(root, "node_modules", "@prisma", "client"),
  path.join(standalone, "node_modules", "@prisma", "client"),
  "node_modules/@prisma/client",
);

// Optional env: present locally for verification; on CI it is written from
// repo secrets before this script runs (or left out for a per-user config).
copyFile(
  path.join(root, ".env"),
  path.join(standalone, ".env"),
  ".env (optional)",
);

console.log("[desktop-prepare] done.");
