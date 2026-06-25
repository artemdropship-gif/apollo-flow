import { chat, type ChatMessage } from "@/lib/ai/openrouter";
import { BLOCKS, isBlockType, type BlockType } from "@/lib/workflow/blocks";

export interface GeneratedNode {
  key: string;
  type: BlockType;
  label: string;
  description: string;
  tech: string;
  tasks: string[];
}

export interface GeneratedEdge {
  from: string;
  to: string;
}

export interface GeneratedArchitecture {
  name: string;
  description: string;
  nodes: GeneratedNode[];
  edges: GeneratedEdge[];
}

const SYSTEM = `Ты — «Проект Аполлон», ИИ-архитектор внутри Apollo-Flow. К пользователю обращаешься «Архитектор».

Тебе дают идею продукта. Спроектируй архитектуру СТРОГО по рабочему стандарту Архитектора:

Дефолтный стек (по умолчанию):
- Frontend: Next.js 15 (App Router) + React + TypeScript + Tailwind + framer-motion + shadcn/ui
- Backend: Next.js Server Actions / API Routes
- БД: PostgreSQL (Neon, pooled) + Prisma
- Деплой: Vercel (+ Vercel Blob для файлов), CI: GitHub Actions
- Auth: Better Auth
- AI: OpenRouter (только бесплатные модели) + Vercel AI SDK

Сторонние интеграции (платежи Stripe/ЮKassa, внешние API, аналитика и т.п.) добавляй как блок ТОЛЬКО если идея явно их требует, и помечай в tech, что подключается по команде.

Доступные типы блоков (type): frontend, backend, api, database, ai, auth, payments, storage, integrations, deployment.

Верни ТОЛЬКО валидный JSON без markdown, по схеме:
{
  "name": "краткое название архитектуры",
  "description": "1-2 предложения",
  "nodes": [
    { "key": "fe", "type": "frontend", "label": "Frontend", "description": "...", "tech": "Next.js, Tailwind, shadcn/ui", "tasks": ["...", "..."] }
  ],
  "edges": [ { "from": "fe", "to": "be" } ]
}

Правила: 4-8 блоков; key — короткий уникальный идентификатор (латиница); tasks — 2-4 конкретных пункта; edges описывают поток данных. Текст полей — по-русски. Никаких комментариев и текста вне JSON.`;

function extractJson(raw: string): string {
  let s = raw.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start >= 0 && end > start) s = s.slice(start, end + 1);
  return s;
}

interface RawNode {
  key?: unknown;
  type?: unknown;
  label?: unknown;
  description?: unknown;
  tech?: unknown;
  tasks?: unknown;
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function normalize(
  idea: string,
  parsed: { name?: unknown; description?: unknown; nodes?: unknown; edges?: unknown },
): GeneratedArchitecture | null {
  if (!Array.isArray(parsed.nodes) || parsed.nodes.length === 0) return null;

  const nodes: GeneratedNode[] = [];
  const seen = new Set<string>();
  for (const item of parsed.nodes as RawNode[]) {
    const type = str(item.type).toLowerCase();
    if (!isBlockType(type)) continue;
    let key = str(item.key).trim() || type;
    while (seen.has(key)) key = `${key}_${seen.size}`;
    seen.add(key);
    const tasks = Array.isArray(item.tasks)
      ? item.tasks.filter((t): t is string => typeof t === "string").slice(0, 6)
      : [];
    nodes.push({
      key,
      type,
      label: str(item.label, type),
      description: str(item.description),
      tech: str(item.tech),
      tasks,
    });
  }
  if (nodes.length === 0) return null;

  const keys = new Set(nodes.map((n) => n.key));
  const edges: GeneratedEdge[] = Array.isArray(parsed.edges)
    ? (parsed.edges as { from?: unknown; to?: unknown }[])
        .map((e) => ({ from: str(e.from), to: str(e.to) }))
        .filter((e) => keys.has(e.from) && keys.has(e.to) && e.from !== e.to)
    : [];

  return {
    name: str(parsed.name, `Архитектура: ${idea}`).slice(0, 120),
    description: str(parsed.description),
    nodes,
    edges,
  };
}

/** Heuristic fallback when the model is unavailable or returns garbage. */
export function fallbackArchitecture(idea: string): GeneratedArchitecture {
  const trimmed = idea.trim() || "Новый продукт";
  const lower = trimmed.toLowerCase();
  const wantsPayments = /оплат|платеж|подписк|payment|stripe|касс/.test(lower);
  const wantsAi = /ai|ии|чат|gpt|нейро|рекоменд/.test(lower);

  const base: GeneratedNode[] = [
    { key: "fe", type: "frontend", label: "Frontend", description: "Интерфейс приложения.", tech: "Next.js 15, Tailwind, shadcn/ui, framer-motion", tasks: ["Страницы и навигация", "Состояние (Zustand) и запросы (TanStack Query)"] },
    { key: "be", type: "backend", label: "Backend", description: "Бизнес-логика и серверные действия.", tech: "Next.js Server Actions / API Routes, zod", tasks: ["Серверные экшены", "Валидация ввода"] },
    { key: "db", type: "database", label: "База данных", description: "Хранение данных.", tech: "PostgreSQL (Neon) + Prisma", tasks: ["Схема Prisma", "Миграции"] },
    { key: "auth", type: "auth", label: "Auth", description: "Аутентификация пользователей.", tech: "Better Auth", tasks: ["Сессии", "Защита роутов"] },
    { key: "deploy", type: "deployment", label: "Деплой", description: "Хостинг и CI.", tech: "Vercel + GitHub Actions", tasks: ["CI: lint/typecheck/test", "Прод-деплой"] },
  ];
  const edges: GeneratedEdge[] = [
    { from: "fe", to: "be" },
    { from: "be", to: "db" },
    { from: "auth", to: "be" },
    { from: "be", to: "deploy" },
  ];
  if (wantsAi) {
    base.push({ key: "ai", type: "ai", label: "AI", description: "ИИ-функции.", tech: "OpenRouter (free) + Vercel AI SDK", tasks: ["Промпты", "Стриминг ответов"] });
    edges.push({ from: "be", to: "ai" });
  }
  if (wantsPayments) {
    base.push({ key: "pay", type: "payments", label: "Платежи", description: "Приём оплат (по команде Архитектора).", tech: "Stripe / ЮKassa — подключается по команде", tasks: ["Чекаут", "Вебхуки"] });
    edges.push({ from: "be", to: "pay" });
  }
  return {
    name: `Архитектура: ${trimmed}`.slice(0, 120),
    description: "Базовая схема на дефолтном стеке Архитектора.",
    nodes: base,
    edges,
  };
}

const NORMALIZE_SYSTEM = `Ты — «Проект Аполлон». Тебе дают описание/ТЗ системы (возможно из Claude, в виде текста или markdown). Преобразуй его в архитектуру Apollo-Flow, СОХРАНЯЯ структуру автора — не выдумывай лишние блоки, опирайся на то, что в тексте. Если чего-то не хватает по дефолтному стеку (БД, деплой) — можешь добавить, но не перегружай.

Верни ТОЛЬКО валидный JSON без markdown, по схеме:
{ "name": "...", "description": "...", "nodes": [ { "key": "fe", "type": "frontend", "label": "...", "description": "...", "tech": "...", "tasks": ["..."] } ], "edges": [ { "from": "fe", "to": "be" } ] }
Допустимые type: frontend, backend, api, database, ai, auth, payments, storage, integrations, deployment. Текст полей — по-русски.`;

/** Convert arbitrary text/markdown (e.g. Claude output) into our schema. */
export async function architectureFromText(
  text: string,
): Promise<{ architecture: GeneratedArchitecture; ai: boolean } | null> {
  const messages: ChatMessage[] = [
    { role: "system", content: NORMALIZE_SYSTEM },
    { role: "user", content: text.slice(0, 8000) },
  ];
  const raw = await chat(messages, { temperature: 0.2, maxTokens: 1400 });
  if (raw) {
    try {
      const parsed = JSON.parse(extractJson(raw)) as Parameters<typeof normalize>[1];
      const arch = normalize(text.slice(0, 80), parsed);
      if (arch) return { architecture: arch, ai: true };
    } catch {
      // fall through
    }
  }
  return null;
}

export async function generateArchitecture(
  idea: string,
): Promise<{ architecture: GeneratedArchitecture; ai: boolean }> {
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM },
    { role: "user", content: `Идея: ${idea}\n\nДоступные типы блоков: ${BLOCKS.map((b) => b.type).join(", ")}.` },
  ];

  const raw = await chat(messages, { temperature: 0.4, maxTokens: 1200 });
  if (raw) {
    try {
      const parsed = JSON.parse(extractJson(raw)) as Parameters<typeof normalize>[1];
      const arch = normalize(idea, parsed);
      if (arch) return { architecture: arch, ai: true };
    } catch {
      // fall through to heuristic
    }
  }
  return { architecture: fallbackArchitecture(idea), ai: false };
}
