"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";

/**
 * Reusable template prompt (#10). The user copies this, sends it to ANY external
 * AI session (even one not created from Apollo-Flow), and the AI replies with a
 * single JSON block that can be pasted back to populate a project.
 */
export const PROJECT_IMPORT_TEMPLATE = `Ты помогаешь перенести проект в систему Apollo-Flow.
Изучи весь наш диалог/контекст и собери всю полезную информацию о проекте.
Верни ОДИН блок JSON (и больше ничего) строго в этой схеме:

\`\`\`json
{
  "name": "название проекта",
  "client": "имя клиента или компании (если есть)",
  "description": "суть проекта в 1-3 предложениях",
  "context": "важный контекст: договорённости, ограничения, решения, история",
  "tasks": ["текущая задача 1", "задача 2", "задача 3"],
  "notes": [
    { "title": "Заголовок заметки", "content": "Текст в Markdown" }
  ]
}
\`\`\`

Заполняй только то, что реально известно. Не выдумывай. Не добавляй текста вне JSON.`;

interface ImportPayload {
  name?: string;
  client?: string;
  description?: string;
  context?: string;
  tasks?: string[];
  notes?: { title?: string; content?: string }[];
}

function extractJson(text: string): ImportPayload | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  try {
    const parsed = JSON.parse(candidate.trim());
    if (parsed && typeof parsed === "object") return parsed as ImportPayload;
  } catch {
    // try to find first { ... last }
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1)) as ImportPayload;
      } catch {
        return null;
      }
    }
  }
  return null;
}

/**
 * Assemble a complete, copyable "working prompt" describing the whole project
 * from all its connected parts. Secrets are referenced by label only — никогда
 * не включаем расшифрованные значения.
 */
export async function buildProjectPrompt(
  id: string,
): Promise<{ ok: boolean; prompt?: string; error?: string }> {
  const user = await requireUser();
  const project = await prisma.project.findFirst({
    where: { id, userId: user.id },
    include: {
      tasks: { orderBy: { order: "asc" } },
      leads: true,
      notes: true,
      vaultItems: true,
      workflows: { include: { nodes: true } },
    },
  });
  if (!project) return { ok: false, error: "Проект не найден" };

  const L: string[] = [];
  L.push(
    `# Проект: ${project.name}`,
    "",
    "Ниже — полный контекст проекта из Apollo-Flow. Используй его как рабочую базу.",
    "",
  );
  if (project.client) L.push(`**Клиент:** ${project.client}`);
  L.push(`**Статус:** ${project.status}`);
  if (project.deadline)
    L.push(`**Дедлайн:** ${project.deadline.toISOString().slice(0, 10)}`);
  L.push("");
  if (project.description) L.push("## Описание", "", project.description, "");
  if (project.context) L.push("## Контекст", "", project.context, "");

  if (project.tasks.length) {
    L.push("## Текущие задачи", "");
    for (const t of project.tasks)
      L.push(`- [${t.done ? "x" : " "}] ${t.title}`);
    L.push("");
  }

  if (project.leads.length) {
    L.push("## Лиды / клиенты", "");
    for (const l of project.leads) {
      const parts = [l.name];
      if (l.niche) parts.push(l.niche);
      if (l.city) parts.push(l.city);
      if (l.phone) parts.push(l.phone);
      if (l.email) parts.push(l.email);
      L.push(`- ${parts.join(" · ")}`);
    }
    L.push("");
  }

  for (const w of project.workflows) {
    L.push(`## Воркфлоу: ${w.name}`, "");
    if (w.goal) L.push(`**Цель:** ${w.goal}`, "");
    if (w.description) L.push(w.description, "");
    if (w.nodes.length) {
      L.push("Блоки архитектуры:");
      for (const n of w.nodes) {
        const meta = [n.type];
        if (n.tech) meta.push(n.tech);
        L.push(`- **${n.label}** (${meta.join(", ")})${n.description ? ` — ${n.description}` : ""}`);
      }
      L.push("");
    }
  }

  if (project.notes.length) {
    L.push("## Заметки", "");
    for (const n of project.notes) {
      L.push(`### ${n.title}`, "", n.content || "—", "");
    }
  }

  if (project.vaultItems.length) {
    L.push("## Доступы и ссылки (значения секретов скрыты)", "");
    for (const v of project.vaultItems) {
      if (v.type === "LINK" && v.url) {
        L.push(`- ${v.label}: ${v.url}`);
      } else {
        L.push(`- ${v.label}${v.category ? ` (${v.category})` : ""} — секрет хранится в Vault`);
      }
    }
    L.push("");
  }

  return { ok: true, prompt: L.join("\n") };
}

export async function importProjectFromText(
  id: string,
  text: string,
): Promise<{ ok: boolean; error?: string; applied?: string[] }> {
  const user = await requireUser();
  const project = await prisma.project.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });
  if (!project) return { ok: false, error: "Проект не найден" };

  const payload = extractJson(text);
  if (!payload) {
    return {
      ok: false,
      error: "Не нашёл корректный JSON. Скопируйте ответ ИИ целиком.",
    };
  }

  const applied: string[] = [];

  const data: Record<string, unknown> = {};
  if (payload.name?.trim()) {
    data.name = payload.name.trim();
    applied.push("название");
  }
  if (payload.client?.trim()) {
    data.client = payload.client.trim();
    applied.push("клиент");
  }
  if (payload.description?.trim()) {
    data.description = payload.description.trim();
    applied.push("описание");
  }
  if (payload.context?.trim()) {
    data.context = payload.context.trim();
    applied.push("контекст");
  }
  if (Object.keys(data).length) {
    await prisma.project.update({ where: { id }, data });
  }

  if (Array.isArray(payload.tasks) && payload.tasks.length) {
    const base = await prisma.task.count({ where: { projectId: id } });
    const tasks = payload.tasks
      .filter((t) => typeof t === "string" && t.trim())
      .map((t, i) => ({ projectId: id, title: t.trim(), order: base + i }));
    if (tasks.length) {
      await prisma.task.createMany({ data: tasks });
      applied.push(`задачи (${tasks.length})`);
    }
  }

  if (Array.isArray(payload.notes) && payload.notes.length) {
    let created = 0;
    for (const n of payload.notes) {
      if (!n || (!n.title?.trim() && !n.content?.trim())) continue;
      await prisma.note.create({
        data: {
          userId: user.id,
          projectId: id,
          title: n.title?.trim() || "Импорт",
          content: n.content ?? "",
        },
      });
      created++;
    }
    if (created) applied.push(`заметки (${created})`);
  }

  if (!applied.length) {
    return { ok: false, error: "В JSON не было данных для импорта." };
  }

  revalidatePath(`/projects/${id}`);
  revalidatePath("/notes");
  return { ok: true, applied };
}
