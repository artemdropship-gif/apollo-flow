// Electron shell for Apollo-Flow.
//
// Apollo-Flow is a full-stack Next.js app (server actions, API routes, Prisma,
// Better Auth). To keep ALL the same functionality as the website, the desktop
// app launches the production Next.js "standalone" server in a child process
// (run by Electron's own bundled Node via ELECTRON_RUN_AS_NODE) and shows it in
// a native window. No browser, no external runtime required.

const { app, BrowserWindow, shell, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const http = require("http");
const crypto = require("crypto");
const { spawn } = require("child_process");

const PORT = Number(process.env.APOLLO_DESKTOP_PORT || 34117);
// Use the explicit IPv4 loopback for binding, the window URL, AND the readiness
// probe. On Windows "localhost" often resolves to IPv6 (::1) first, which can
// mismatch how the Next server binds and cause "Server did not start in time".
// 127.0.0.1 is unambiguous everywhere, and Better Auth trusts this origin.
const HOST = "127.0.0.1";
const BASE_URL = `http://${HOST}:${PORT}`;

// Keep the last lines of the embedded server's output so we can show a real
// reason if it fails to come up (instead of a generic timeout).
const serverLogLines = [];
let serverExitInfo = null;
function recordServerLog(chunk) {
  const text = String(chunk);
  process.stdout.write(`[next] ${text}`);
  for (const line of text.split(/\r?\n/)) {
    if (line.trim()) serverLogLines.push(line);
  }
  while (serverLogLines.length > 40) serverLogLines.shift();
}
function serverLogTail() {
  return serverLogLines.slice(-15).join("\n");
}

// In a packaged app the server bundle lives under resources/; in dev it's the
// repo's .next/standalone produced by `next build`.
const isPackaged = app.isPackaged;
const serverRoot = isPackaged
  ? path.join(process.resourcesPath, "standalone")
  : path.join(__dirname, "..", ".next", "standalone");
const serverEntry = path.join(serverRoot, "server.js");

let serverProcess = null;
let mainWindow = null;

/** Minimal .env parser (KEY=VALUE per line). Avoids an extra dependency. */
function loadEnvFile(file) {
  const env = {};
  if (!fs.existsSync(file)) return env;
  const text = fs.readFileSync(file, "utf8");
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

const ENV_TEMPLATE = `# Apollo-Flow — настройки приложения.
# Заполните строки ниже своими значениями и перезапустите программу.

# Строка подключения к базе данных PostgreSQL (Neon). ОБЯЗАТЕЛЬНО.
DATABASE_URL=

# ИИ-ассистент (Claude через Anthropic-совместимый шлюз).
# Без токена ассистент работает в офлайн-режиме (эвристика, без внешних вызовов).
ANTHROPIC_BASE_URL=https://aiprimetech.io
ANTHROPIC_AUTH_TOKEN=
ANTHROPIC_MODEL=claude-sonnet-4-6

# Ключ шифрования хранилища доступов (Vault). 64 hex-символа.
# Сгенерировать: openssl rand -hex 32
VAULT_ENCRYPTION_KEY=

# Секрет авторизации. Можно оставить пустым — приложение сгенерирует автоматически.
BETTER_AUTH_SECRET=
`;

function userEnvPath() {
  return path.join(app.getPath("userData"), ".env");
}

function resolveEnv() {
  // Packaged: read .env shipped alongside the server bundle (if any), then a
  // per-user override in userData (lets the user set credentials without
  // rebuilding). Dev: read the repo .env.
  const candidates = isPackaged
    ? [path.join(serverRoot, ".env"), userEnvPath()]
    : [path.join(__dirname, "..", ".env")];
  let env = {};
  for (const file of candidates) env = { ...env, ...loadEnvFile(file) };
  return env;
}

/**
 * First-run guard: the packaged app needs at least DATABASE_URL. If it's
 * missing, write a template to the per-user config file, open the folder, and
 * tell the user where to put their credentials. Returns true if good to start.
 */
function ensureConfigured(env) {
  if (!isPackaged) return true; // dev uses the repo .env
  if (env.DATABASE_URL && env.DATABASE_URL.trim()) {
    // Persist an auto-generated auth secret once so sessions stay valid.
    if (!env.BETTER_AUTH_SECRET || !env.BETTER_AUTH_SECRET.trim()) {
      env.BETTER_AUTH_SECRET = crypto.randomBytes(32).toString("hex");
      try {
        const file = userEnvPath();
        const existing = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
        if (!/^BETTER_AUTH_SECRET=.+/m.test(existing)) {
          fs.appendFileSync(
            file,
            `\nBETTER_AUTH_SECRET=${env.BETTER_AUTH_SECRET}\n`,
          );
        }
      } catch {
        /* non-fatal */
      }
    }
    return true;
  }

  const file = userEnvPath();
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    if (!fs.existsSync(file)) fs.writeFileSync(file, ENV_TEMPLATE);
  } catch {
    /* ignore */
  }
  dialog.showMessageBoxSync({
    type: "info",
    title: "Apollo-Flow — первая настройка",
    message: "Нужно указать доступ к базе данных",
    detail:
      "Откройте файл настроек и впишите DATABASE_URL (и, по желанию, " +
      "ANTHROPIC_AUTH_TOKEN для ИИ-ассистента), затем снова запустите Apollo-Flow.\n\n" +
      `Файл: ${file}`,
    buttons: ["Открыть папку и выйти"],
  });
  shell.showItemInFolder(file);
  return false;
}

function waitForServer(timeoutMs = 90000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      // If the server process already died, fail immediately with its output.
      if (serverExitInfo) {
        reject(
          new Error(
            `Встроенный сервер завершился (код ${serverExitInfo.code}).\n\n` +
              serverLogTail(),
          ),
        );
        return;
      }
      const req = http.get(
        { host: HOST, port: PORT, path: "/", family: 4 },
        (res) => {
          res.destroy();
          resolve();
        },
      );
      req.on("error", () => {
        if (Date.now() - start > timeoutMs) {
          const tail = serverLogTail();
          reject(
            new Error(
              "Сервер не запустился вовремя." +
                (tail ? `\n\nПоследние сообщения сервера:\n${tail}` : ""),
            ),
          );
        } else {
          setTimeout(tryOnce, 300);
        }
      });
    };
    tryOnce();
  });
}

function startServer(fileEnv) {
  const childEnv = {
    ...process.env,
    ...fileEnv,
    NODE_ENV: "production",
    PORT: String(PORT),
    HOSTNAME: HOST,
    // Server-side runtime URLs follow the chosen port so auth/links match.
    BETTER_AUTH_URL: BASE_URL,
    NEXT_PUBLIC_APP_URL: BASE_URL,
    // Run the bundled server.js with Electron's Node instead of a system Node.
    ELECTRON_RUN_AS_NODE: "1",
  };

  serverProcess = spawn(process.execPath, [serverEntry], {
    cwd: serverRoot,
    env: childEnv,
    stdio: ["ignore", "pipe", "pipe"],
  });
  serverProcess.stdout.on("data", recordServerLog);
  serverProcess.stderr.on("data", recordServerLog);
  serverProcess.on("exit", (code) => {
    serverExitInfo = { code };
    // Persist the server log so a failed launch can be diagnosed afterwards.
    try {
      fs.writeFileSync(
        path.join(app.getPath("userData"), "server.log"),
        serverLogLines.join("\n"),
      );
    } catch {
      /* ignore */
    }
    if (code && code !== 0 && !app.isQuitting && mainWindow) {
      dialog.showErrorBox(
        "Apollo-Flow",
        `Встроенный сервер завершился с кодом ${code}.\n\n${serverLogTail()}`,
      );
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: "#0a0a0a",
    show: false,
    title: "Apollo-Flow",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.loadURL(BASE_URL);

  // Open external links (mailto:, wa.me, t.me, http...) in the system browser
  // instead of inside the app window.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(BASE_URL)) return { action: "allow" };
    shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(BASE_URL)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// Single-instance: focus the existing window instead of launching twice.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    if (!fs.existsSync(serverEntry)) {
      dialog.showErrorBox(
        "Apollo-Flow",
        `Не найден встроенный сервер:\n${serverEntry}\n\nСоберите проект: npm run desktop:prepare`,
      );
      app.quit();
      return;
    }
    const fileEnv = resolveEnv();
    if (!ensureConfigured(fileEnv)) {
      app.quit();
      return;
    }
    startServer(fileEnv);
    try {
      await waitForServer();
    } catch (e) {
      dialog.showErrorBox("Apollo-Flow", String(e && e.message ? e.message : e));
      app.quit();
      return;
    }
    createWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on("before-quit", () => {
  app.isQuitting = true;
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
