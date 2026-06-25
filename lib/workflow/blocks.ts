export type BlockType =
  | "frontend"
  | "backend"
  | "api"
  | "database"
  | "ai"
  | "auth"
  | "payments"
  | "storage"
  | "integrations"
  | "deployment";

export interface BlockMeta {
  type: BlockType;
  label: string;
  color: string;
  hint: string;
}

export const BLOCKS: BlockMeta[] = [
  { type: "frontend", label: "Frontend", color: "#3b82f6", hint: "Next.js + Tailwind + shadcn/ui" },
  { type: "backend", label: "Backend", color: "#22c55e", hint: "Server Actions / API Routes" },
  { type: "api", label: "API", color: "#06b6d4", hint: "REST / интеграционный слой" },
  { type: "database", label: "База данных", color: "#a855f7", hint: "PostgreSQL (Neon) + Prisma" },
  { type: "ai", label: "AI", color: "#f59e0b", hint: "OpenRouter (free) + Vercel AI SDK" },
  { type: "auth", label: "Auth", color: "#ef4444", hint: "Better Auth" },
  { type: "payments", label: "Платежи", color: "#ec4899", hint: "Stripe / ЮKassa (по команде)" },
  { type: "storage", label: "Хранилище", color: "#14b8a6", hint: "Vercel Blob" },
  { type: "integrations", label: "Интеграции", color: "#f97316", hint: "Внешние API (по команде)" },
  { type: "deployment", label: "Деплой", color: "#64748b", hint: "Vercel + GitHub Actions CI" },
];

const BY_TYPE = new Map(BLOCKS.map((b) => [b.type, b]));

export function blockMeta(type: string): BlockMeta {
  return BY_TYPE.get(type as BlockType) ?? BLOCKS[0];
}

export function isBlockType(value: string): value is BlockType {
  return BY_TYPE.has(value as BlockType);
}
