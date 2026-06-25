import { chat, type ChatMessage } from "@/lib/ai/openrouter";
import { buildStandard } from "@/lib/ai/build-standard";
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

/** A page/screen of the product (часть продуктового брифа). */
export interface GeneratedPage {
  name: string;
  purpose: string;
}

export interface GeneratedArchitecture {
  name: string;
  /** Суть/краткое описание продукта. */
  description: string;
  /** Цель — что бизнес хочет получить. */
  goal: string;
  /** Страницы/экраны продукта. */
  pages: GeneratedPage[];
  /** Дизайн-решения: стиль, палитра, шрифт, UX-принципы. */
  design: string;
  nodes: GeneratedNode[];
  edges: GeneratedEdge[];
}

const SCHEMA = `{
  "name": "краткое название продукта",
  "description": "суть продукта в 1-2 предложениях",
  "goal": "цель: что бизнес/пользователь хочет получить",
  "pages": [ { "name": "Главная", "purpose": "что на ней и зачем" } ],
  "design": "дизайн-решения: стиль, палитра, шрифт, UX-принципы",
  "nodes": [
    { "key": "fe", "type": "frontend", "label": "Frontend", "description": "...", "tech": "Next.js, Tailwind, shadcn/ui", "tasks": ["...", "..."] }
  ],
  "edges": [ { "from": "fe", "to": "be" } ]
}`;

function systemPrompt(): string {
  const std = buildStandard();
  const standardBlock = std
    ? `\n\nРАБОЧИЙ СТАНДАРТ АРХИТЕКТОРА (канон — строй строго по нему, это его готовый рабочий промт):\n"""\n${std}\n"""`
    : "";
  return `Ты — «Проект Аполлон», ИИ-архитектор внутри Apollo-Flow. К пользователю обращаешься «Архитектор».

Тебе дают идею продукта. Спроектируй продукт и его архитектуру СТРОГО по рабочему стандарту Архитектора (ниже): дефолтный стек по умолчанию, сторонние интеграции — только если идея явно их требует (помечай в tech, что подключается по команде).${standardBlock}

Кроме архитектуры (блоки + связи) опиши ПРОДУКТ: цель, суть, страницы/экраны и дизайн-решения — это то, что помогает Архитектору структурировать продукт, а не только код.

Доступные типы блоков (type): frontend, backend, api, database, ai, auth, payments, storage, integrations, deployment.

Верни ТОЛЬКО валидный JSON без markdown, по схеме:
${SCHEMA}

Правила: 4-8 блоков; 3-7 страниц; key — короткий уникальный идентификатор (латиница); tasks — 2-4 конкретных пункта; edges описывают поток данных. Текст полей — по-русски. Никаких комментариев и текста вне JSON.`;
}

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

function parsePages(value: unknown): GeneratedPage[] {
  if (!Array.isArray(value)) return [];
  const pages: GeneratedPage[] = [];
  for (const item of value) {
    if (typeof item === "string") {
      if (item.trim()) pages.push({ name: item.trim().slice(0, 80), purpose: "" });
      continue;
    }
    if (item && typeof item === "object") {
      const o = item as Record<string, unknown>;
      const name = str(o.name).trim();
      if (name) pages.push({ name: name.slice(0, 80), purpose: str(o.purpose).slice(0, 300) });
    }
  }
  return pages.slice(0, 20);
}

function normalize(
  idea: string,
  parsed: {
    name?: unknown;
    description?: unknown;
    goal?: unknown;
    pages?: unknown;
    design?: unknown;
    nodes?: unknown;
    edges?: unknown;
  },
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
    goal: str(parsed.goal),
    pages: parsePages(parsed.pages),
    design: str(parsed.design),
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
    goal: trimmed,
    pages: [
      { name: "Главная", purpose: "Точка входа: суть продукта и призыв к действию." },
      { name: "Личный кабинет", purpose: "Данные и действия пользователя после входа." },
    ],
    design:
      "Минимализм в стиле Vercel: тёмный фон, тонкие границы, моноширинный шрифт, цвет — только для данных.",
    nodes: base,
    edges,
  };
}

const NORMALIZE_SYSTEM = `Ты — «Проект Аполлон». Тебе дают описание/ТЗ системы (возможно из Claude, в виде текста или markdown). Преобразуй его в продукт+архитектуру Apollo-Flow, СОХРАНЯЯ структуру автора — не выдумывай лишние блоки, опирайся на то, что в тексте. Вытащи цель, суть, страницы и дизайн-решения из текста, если они там есть; чего нет по дефолтному стеку (БД, деплой) — можешь добавить, но не перегружай.

Верни ТОЛЬКО валидный JSON без markdown, по схеме:
${SCHEMA}
Допустимые type: frontend, backend, api, database, ai, auth, payments, storage, integrations, deployment. Текст полей — по-русски.`;

/** Convert arbitrary text/markdown (e.g. Claude output) into our schema. */
export async function architectureFromText(
  text: string,
): Promise<{ architecture: GeneratedArchitecture; ai: boolean } | null> {
  const messages: ChatMessage[] = [
    { role: "system", content: NORMALIZE_SYSTEM },
    { role: "user", content: text.slice(0, 8000) },
  ];
  const raw = await chat(messages, { temperature: 0.2, maxTokens: 1800 });
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
  businessContext?: string,
): Promise<{ architecture: GeneratedArchitecture; ai: boolean }> {
  const business = businessContext?.trim()
    ? `\n\nДанные существующего бизнеса (проектируй продукт ПОД него — что ему продать/сделать):\n${businessContext.trim()}`
    : "";
  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt() },
    {
      role: "user",
      content: `Идея: ${idea}${business}\n\nДоступные типы блоков: ${BLOCKS.map((b) => b.type).join(", ")}.`,
    },
  ];

  const raw = await chat(messages, { temperature: 0.4, maxTokens: 1800 });
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
