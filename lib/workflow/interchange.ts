import { blockMeta, isBlockType, type BlockType } from "@/lib/workflow/blocks";

export const INTERCHANGE_VERSION = 1;

export interface InterchangeNode {
  key: string;
  type: BlockType;
  label: string;
  description: string;
  tech: string;
  tasks: string[];
}

export interface InterchangeEdge {
  from: string;
  to: string;
}

export interface InterchangePage {
  name: string;
  purpose: string;
}

export interface Interchange {
  apolloFlow: number;
  name: string;
  description: string;
  goal: string;
  pages: InterchangePage[];
  design: string;
  nodes: InterchangeNode[];
  edges: InterchangeEdge[];
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function parsePages(value: unknown): InterchangePage[] {
  if (!Array.isArray(value)) return [];
  const pages: InterchangePage[] = [];
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

/** Parse our own JSON interchange. Returns null if it isn't valid. */
export function parseInterchange(raw: unknown): Interchange | null {
  let obj: unknown = raw;
  if (typeof raw === "string") {
    let s = raw.trim();
    const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) s = fence[1].trim();
    const start = s.indexOf("{");
    const end = s.lastIndexOf("}");
    if (start >= 0 && end > start) s = s.slice(start, end + 1);
    try {
      obj = JSON.parse(s);
    } catch {
      return null;
    }
  }
  if (!obj || typeof obj !== "object") return null;
  const o = obj as Record<string, unknown>;
  if (!Array.isArray(o.nodes)) return null;

  const seen = new Set<string>();
  const nodes: InterchangeNode[] = [];
  for (const item of o.nodes as Record<string, unknown>[]) {
    if (!item || typeof item !== "object") continue;
    const type = str(item.type).toLowerCase();
    if (!isBlockType(type)) continue;
    let key = str(item.key).trim() || type;
    while (seen.has(key)) key = `${key}_${seen.size}`;
    seen.add(key);
    nodes.push({
      key,
      type,
      label: str(item.label, type),
      description: str(item.description),
      tech: str(item.tech),
      tasks: Array.isArray(item.tasks)
        ? item.tasks.filter((t): t is string => typeof t === "string").slice(0, 12)
        : [],
    });
  }
  if (nodes.length === 0) return null;

  const keys = new Set(nodes.map((n) => n.key));
  const edges: InterchangeEdge[] = Array.isArray(o.edges)
    ? (o.edges as Record<string, unknown>[])
        .map((e) => ({ from: str(e.from), to: str(e.to) }))
        .filter((e) => keys.has(e.from) && keys.has(e.to) && e.from !== e.to)
    : [];

  return {
    apolloFlow: INTERCHANGE_VERSION,
    name: str(o.name, "Импортированная схема").slice(0, 120),
    description: str(o.description),
    goal: str(o.goal),
    pages: parsePages(o.pages),
    design: str(o.design),
    nodes,
    edges,
  };
}

export function toJsonExport(data: Interchange): string {
  return JSON.stringify(data, null, 2);
}

const CLAUDE_HEADER = `<!--
Это ГОТОВЫЙ ПРОМТ из Apollo-Flow: рабочий стандарт (база) + ТЗ проекта + архитектура.
ВЫПОЛНЯЙ СТРОГО по рабочему стандарту и ТЗ ниже. НИЧЕГО ЛИШНЕГО не добавляй
сверх описанного; недостающее дополняй только по дефолтному стеку стандарта.
Можешь дополнить/изменить: цель, суть, страницы, дизайн-решения, блоки и связи.
Когда закончишь, верни ОБНОВЛЁННЫЙ результат ОДНИМ блоком JSON ровно в этой схеме
(его Apollo-Flow загрузит обратно):

{
  "apolloFlow": 1,
  "name": "название",
  "description": "суть в 1-2 предложениях",
  "goal": "цель продукта",
  "pages": [ { "name": "Главная", "purpose": "что на ней и зачем" } ],
  "design": "дизайн-решения: стиль, палитра, шрифт, UX",
  "nodes": [
    { "key": "fe", "type": "frontend", "label": "Frontend", "description": "...", "tech": "...", "tasks": ["...", "..."] }
  ],
  "edges": [ { "from": "fe", "to": "be" } ]
}

Допустимые type: frontend, backend, api, database, ai, auth, payments, storage, integrations, deployment.
-->`;

/**
 * A self-contained prompt for Claude: the Architect's working standard (base,
 * verbatim) + the project ТЗ (goal/pages/design) + the architecture + an embedded
 * JSON block for round-tripping. Pass `standard` to embed the base prompt on top.
 */
export function toMarkdownExport(data: Interchange, standard?: string): string {
  const lines: string[] = [];
  lines.push(CLAUDE_HEADER, "");
  if (standard && standard.trim()) {
    lines.push("# Рабочий стандарт (база — не менять, выполнять по нему)", "");
    lines.push(standard.trim(), "");
    lines.push("---", "");
    lines.push("# ТЗ проекта", "");
  }
  lines.push(`## ${data.name}`, "");
  if (data.description) lines.push(data.description, "");

  if (data.goal) lines.push("## Цель", "", data.goal, "");

  if (data.pages.length) {
    lines.push("## Страницы", "");
    for (const p of data.pages) {
      lines.push(p.purpose ? `- **${p.name}** — ${p.purpose}` : `- **${p.name}**`);
    }
    lines.push("");
  }

  if (data.design) lines.push("## Дизайн-решения", "", data.design, "");

  const byKey = new Map(data.nodes.map((n) => [n.key, n]));
  lines.push("## Блоки", "");
  for (const n of data.nodes) {
    lines.push(`### ${n.label} (${blockMeta(n.type).label})`);
    if (n.tech) lines.push(`- **Технологии:** ${n.tech}`);
    if (n.description) lines.push(`- **Описание:** ${n.description}`);
    if (n.tasks.length) {
      lines.push("- **Задачи:**");
      for (const t of n.tasks) lines.push(`  - [ ] ${t}`);
    }
    lines.push("");
  }

  if (data.edges.length) {
    lines.push("## Связи", "");
    for (const e of data.edges) {
      const a = byKey.get(e.from)?.label ?? e.from;
      const b = byKey.get(e.to)?.label ?? e.to;
      lines.push(`- ${a} → ${b}`);
    }
    lines.push("");
  }

  lines.push("## Машинный формат (для повторной загрузки)", "");
  lines.push("```json", toJsonExport(data), "```");
  return lines.join("\n");
}
