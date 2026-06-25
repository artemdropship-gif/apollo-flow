"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  architectureFromText,
  augmentArchitecture,
  generateArchitecture,
  type GeneratedArchitecture,
  type GeneratedPage,
} from "@/lib/ai/architecture";
import { buildStandard } from "@/lib/ai/build-standard";
import { blockMeta, isBlockType } from "@/lib/workflow/blocks";
import {
  parseInterchange,
  toJsonExport,
  toMarkdownExport,
  type Interchange,
} from "@/lib/workflow/interchange";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";

export interface WorkflowSummary {
  id: string;
  name: string;
  description: string | null;
  nodeCount: number;
  updatedAt: string;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
}

export interface WorkflowNodeData {
  id: string;
  type: string;
  label: string;
  description: string;
  notes: string;
  tech: string;
  tasks: string[];
  posX: number;
  posY: number;
  color: string;
}

export interface WorkflowDetail {
  id: string;
  name: string;
  description: string | null;
  goal: string;
  pages: GeneratedPage[];
  design: string;
  nodes: WorkflowNodeData[];
  edges: WorkflowEdge[];
}

function readPages(value: unknown): GeneratedPage[] {
  if (!Array.isArray(value)) return [];
  const out: GeneratedPage[] = [];
  for (const item of value) {
    if (item && typeof item === "object") {
      const o = item as Record<string, unknown>;
      const name = typeof o.name === "string" ? o.name : "";
      if (name.trim()) {
        out.push({
          name: name.slice(0, 80),
          purpose: typeof o.purpose === "string" ? o.purpose.slice(0, 300) : "",
        });
      }
    }
  }
  return out;
}

/** Lay generated blocks out in tidy columns by architectural tier. */
const TIER: Record<string, number> = {
  frontend: 0,
  auth: 0,
  api: 1,
  backend: 1,
  ai: 2,
  payments: 2,
  integrations: 2,
  storage: 2,
  database: 3,
  deployment: 4,
};

function layout(index: number, type: string): { x: number; y: number } {
  const col = TIER[type] ?? 1;
  return { x: col * 280, y: (index % 4) * 150 + (col % 2) * 40 };
}

export async function getWorkflows(): Promise<WorkflowSummary[]> {
  const user = await requireUser();
  const rows = await prisma.workflow.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { nodes: true } } },
  });
  return rows.map((w) => ({
    id: w.id,
    name: w.name,
    description: w.description,
    nodeCount: w._count.nodes,
    updatedAt: w.updatedAt.toISOString(),
  }));
}

export async function getWorkflow(id: string): Promise<WorkflowDetail | null> {
  const user = await requireUser();
  const w = await prisma.workflow.findFirst({
    where: { id, userId: user.id },
    include: { nodes: true },
  });
  if (!w) return null;

  const edges = Array.isArray(w.edges) ? (w.edges as unknown as WorkflowEdge[]) : [];
  return {
    id: w.id,
    name: w.name,
    description: w.description,
    goal: w.goal ?? "",
    pages: readPages(w.pages),
    design: w.design ?? "",
    nodes: w.nodes.map((n) => ({
      id: n.id,
      type: n.type,
      label: n.label,
      description: n.description ?? "",
      notes: n.notes ?? "",
      tech: n.tech ?? "",
      tasks: Array.isArray(n.tasks) ? (n.tasks as unknown as string[]) : [],
      posX: n.posX,
      posY: n.posY,
      color: n.color ?? blockMeta(n.type).color,
    })),
    edges: edges.filter((e) => e && e.source && e.target),
  };
}

/** Create a workflow + nodes + edges from an architecture. Returns its id. */
async function persistArchitecture(
  userId: string,
  arch: GeneratedArchitecture | Interchange,
): Promise<string> {
  const workflow = await prisma.workflow.create({
    data: {
      userId,
      name: arch.name,
      description: arch.description,
      goal: "goal" in arch ? arch.goal : null,
      pages: "pages" in arch ? (arch.pages as unknown as object) : undefined,
      design: "design" in arch ? arch.design : null,
    },
  });

  const keyToId = new Map<string, string>();
  for (let i = 0; i < arch.nodes.length; i++) {
    const n = arch.nodes[i];
    const pos = layout(i, n.type);
    const created = await prisma.workflowNode.create({
      data: {
        workflowId: workflow.id,
        type: n.type,
        label: n.label,
        description: n.description,
        tech: n.tech,
        tasks: n.tasks,
        posX: pos.x,
        posY: pos.y,
        color: blockMeta(n.type).color,
      },
    });
    keyToId.set(n.key, created.id);
  }

  const edges = mapEdges(arch.edges, keyToId);
  await prisma.workflow.update({
    where: { id: workflow.id },
    data: { edges: edges as unknown as object },
  });
  return workflow.id;
}

function mapEdges(
  edges: { from: string; to: string }[],
  keyToId: Map<string, string>,
): WorkflowEdge[] {
  return edges
    .map((e) => {
      const source = keyToId.get(e.from);
      const target = keyToId.get(e.to);
      return source && target
        ? { id: `${source}-${target}`, source, target }
        : null;
    })
    .filter((e): e is WorkflowEdge => e !== null);
}

export interface WorkflowLeadOption {
  id: string;
  label: string;
}

/** Saved leads offered as a business context source for generation. */
export async function getWorkflowLeads(): Promise<WorkflowLeadOption[]> {
  const user = await requireUser();
  const leads = await prisma.lead.findMany({
    where: { userId: user.id },
    orderBy: [{ leadScore: "desc" }, { createdAt: "desc" }],
    select: { id: true, name: true, niche: true, city: true, leadScore: true },
    take: 100,
  });
  return leads.map((l) => ({
    id: l.id,
    label: [l.name, l.niche, l.city].filter(Boolean).join(" · ") + ` · ${l.leadScore}`,
  }));
}

async function businessContext(userId: string, leadId: string): Promise<string | null> {
  const l = await prisma.lead.findFirst({ where: { id: leadId, userId } });
  if (!l) return null;
  const parts = [
    `Название: ${l.name}`,
    l.niche ? `Ниша: ${l.niche}` : null,
    l.city ? `Город: ${l.city}` : null,
    l.website ? `Сайт: ${l.website}` : "Сайта нет",
    l.websiteStatus ? `Статус сайта: ${l.websiteStatus}` : null,
    `Lead score: ${l.leadScore}`,
    l.aiRecommendations ? `Что улучшить: ${l.aiRecommendations.slice(0, 600)}` : null,
  ];
  return parts.filter(Boolean).join("\n");
}

export async function generateWorkflow(input: {
  idea: string;
  leadId?: string;
}): Promise<{ ok: boolean; id?: string; ai?: boolean; error?: string }> {
  const user = await requireUser();
  let idea = input.idea.trim();

  let context: string | null = null;
  if (input.leadId) {
    context = await businessContext(user.id, input.leadId);
    if (!context) return { ok: false, error: "Бизнес не найден." };
    if (idea.length < 3) idea = "Продукт/сайт для этого бизнеса, который ему стоит сделать.";
  }

  if (idea.length < 3) {
    return { ok: false, error: "Опишите идею подробнее, Архитектор." };
  }

  const { architecture, ai } = await generateArchitecture(idea, context ?? undefined);
  const id = await persistArchitecture(user.id, architecture);

  await prisma.activity
    .create({
      data: {
        userId: user.id,
        type: "workflow.generate",
        entity: "workflow",
        entityId: id,
        meta: { idea: idea.slice(0, 200), ai, leadId: input.leadId ?? null },
      },
    })
    .catch(() => undefined);

  revalidatePath("/workflow");
  revalidatePath("/dashboard");
  return { ok: true, id, ai };
}

export async function exportWorkflow(id: string): Promise<{
  ok: boolean;
  name?: string;
  json?: string;
  markdown?: string;
}> {
  const detail = await getWorkflow(id);
  if (!detail) return { ok: false };

  const idToKey = new Map(detail.nodes.map((n) => [n.id, n.type + "_" + n.id.slice(-4)]));
  const data: Interchange = {
    apolloFlow: 1,
    name: detail.name,
    description: detail.description ?? "",
    goal: detail.goal,
    pages: detail.pages,
    design: detail.design,
    nodes: detail.nodes.map((n) => ({
      key: idToKey.get(n.id)!,
      type: n.type as Interchange["nodes"][number]["type"],
      label: n.label,
      description: n.description,
      tech: n.tech,
      tasks: n.tasks,
    })),
    edges: detail.edges
      .map((e) => ({ from: idToKey.get(e.source), to: idToKey.get(e.target) }))
      .filter((e): e is { from: string; to: string } => !!e.from && !!e.to),
  };
  return {
    ok: true,
    name: detail.name,
    json: toJsonExport(data),
    markdown: toMarkdownExport(data, buildStandard()),
  };
}

export async function importArchitecture(input: {
  text: string;
  mergeInto?: string;
}): Promise<{ ok: boolean; id?: string; ai?: boolean; error?: string }> {
  const user = await requireUser();
  const text = input.text.trim();
  if (text.length < 2) return { ok: false, error: "Пусто — вставьте схему или текст." };

  // JSON-first (our own export round-trips losslessly), else AI-normalize.
  let arch: GeneratedArchitecture | Interchange | null = parseInterchange(text);
  let ai = false;
  if (!arch) {
    const res = await architectureFromText(text);
    if (res) {
      arch = res.architecture;
      ai = true;
    }
  }
  if (!arch) {
    return { ok: false, error: "Не удалось распознать схему. Проверьте формат." };
  }

  if (input.mergeInto) {
    const id = await mergeIntoWorkflow(user.id, input.mergeInto, arch);
    if (!id) return { ok: false, error: "Текущая схема не найдена." };
    revalidatePath("/workflow");
    return { ok: true, id, ai };
  }

  const id = await persistArchitecture(user.id, arch);
  await prisma.activity
    .create({
      data: {
        userId: user.id,
        type: "workflow.import",
        entity: "workflow",
        entityId: id,
        meta: { ai },
      },
    })
    .catch(() => undefined);
  revalidatePath("/workflow");
  revalidatePath("/dashboard");
  return { ok: true, id, ai };
}

async function mergeIntoWorkflow(
  userId: string,
  workflowId: string,
  arch: GeneratedArchitecture | Interchange,
): Promise<string | null> {
  const existing = await prisma.workflow.findFirst({
    where: { id: workflowId, userId },
    include: { nodes: true },
  });
  if (!existing) return null;

  const baseY = existing.nodes.reduce((m, n) => Math.max(m, n.posY), 0) + 200;
  const keyToId = new Map<string, string>();
  for (let i = 0; i < arch.nodes.length; i++) {
    const n = arch.nodes[i];
    const pos = layout(i, n.type);
    const created = await prisma.workflowNode.create({
      data: {
        workflowId,
        type: n.type,
        label: n.label,
        description: n.description,
        tech: n.tech,
        tasks: n.tasks,
        posX: pos.x,
        posY: baseY + pos.y,
        color: blockMeta(n.type).color,
      },
    });
    keyToId.set(n.key, created.id);
  }

  const prevEdges = Array.isArray(existing.edges)
    ? (existing.edges as unknown as WorkflowEdge[])
    : [];
  const newEdges = mapEdges(arch.edges, keyToId);
  await prisma.workflow.update({
    where: { id: workflowId },
    data: { edges: [...prevEdges, ...newEdges] as unknown as object },
  });
  return workflowId;
}

const saveSchema = z.object({
  id: z.string().min(1),
  name: z.string().max(120).optional(),
  description: z.string().max(2000).optional(),
  goal: z.string().max(2000).optional(),
  design: z.string().max(2000).optional(),
  pages: z
    .array(z.object({ name: z.string().max(80), purpose: z.string().max(300) }))
    .max(20)
    .optional(),
  edges: z
    .array(z.object({ id: z.string(), source: z.string(), target: z.string() }))
    .max(100),
  nodes: z
    .array(
      z.object({
        id: z.string(),
        posX: z.number(),
        posY: z.number(),
        label: z.string().max(120).optional(),
        description: z.string().max(2000).optional(),
        notes: z.string().max(4000).optional(),
        tech: z.string().max(500).optional(),
        tasks: z.array(z.string().max(300)).max(20).optional(),
      }),
    )
    .max(100),
});

export async function saveWorkflowGraph(
  input: z.infer<typeof saveSchema>,
): Promise<{ ok: boolean }> {
  const user = await requireUser();
  const data = saveSchema.parse(input);

  const owned = await prisma.workflow.findFirst({
    where: { id: data.id, userId: user.id },
    select: { id: true },
  });
  if (!owned) return { ok: false };

  await prisma.$transaction([
    ...data.nodes.map((n) =>
      prisma.workflowNode.updateMany({
        where: { id: n.id, workflowId: data.id },
        data: {
          posX: n.posX,
          posY: n.posY,
          ...(n.label !== undefined ? { label: n.label } : {}),
          ...(n.description !== undefined ? { description: n.description } : {}),
          ...(n.notes !== undefined ? { notes: n.notes } : {}),
          ...(n.tech !== undefined ? { tech: n.tech } : {}),
          ...(n.tasks !== undefined ? { tasks: n.tasks } : {}),
        },
      }),
    ),
    prisma.workflow.update({
      where: { id: data.id },
      data: {
        edges: data.edges as unknown as object,
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.goal !== undefined ? { goal: data.goal } : {}),
        ...(data.design !== undefined ? { design: data.design } : {}),
        ...(data.pages !== undefined ? { pages: data.pages as unknown as object } : {}),
      },
    }),
  ]);

  revalidatePath("/workflow");
  return { ok: true };
}

export async function addWorkflowNode(
  workflowId: string,
  type: string,
): Promise<{ ok: boolean; node?: WorkflowNodeData }> {
  const user = await requireUser();
  if (!isBlockType(type)) return { ok: false };
  const owned = await prisma.workflow.findFirst({
    where: { id: workflowId, userId: user.id },
    select: { id: true },
  });
  if (!owned) return { ok: false };

  const meta = blockMeta(type);
  const node = await prisma.workflowNode.create({
    data: {
      workflowId,
      type,
      label: meta.label,
      description: meta.hint,
      tech: meta.hint,
      posX: 40,
      posY: 40,
      color: meta.color,
    },
  });
  revalidatePath("/workflow");
  return {
    ok: true,
    node: {
      id: node.id,
      type: node.type,
      label: node.label,
      description: node.description ?? "",
      notes: "",
      tech: node.tech ?? "",
      tasks: [],
      posX: node.posX,
      posY: node.posY,
      color: node.color ?? meta.color,
    },
  };
}

export async function deleteWorkflowNode(
  nodeId: string,
): Promise<{ ok: boolean }> {
  const user = await requireUser();
  const node = await prisma.workflowNode.findFirst({
    where: { id: nodeId, workflow: { userId: user.id } },
    select: { id: true },
  });
  if (!node) return { ok: false };
  await prisma.workflowNode.delete({ where: { id: nodeId } });
  revalidatePath("/workflow");
  return { ok: true };
}

/** Create a blank workflow (no AI) so the Architect can build it by hand. */
export async function createEmptyWorkflow(
  name?: string,
): Promise<{ ok: boolean; id?: string }> {
  const user = await requireUser();
  const workflow = await prisma.workflow.create({
    data: {
      userId: user.id,
      name: (name?.trim() || "Новый воркфлоу").slice(0, 120),
      description: "",
      goal: "",
      design: "",
      edges: [] as unknown as object,
    },
    select: { id: true },
  });
  await prisma.activity
    .create({
      data: {
        userId: user.id,
        type: "workflow.create_empty",
        entity: "workflow",
        entityId: workflow.id,
      },
    })
    .catch(() => undefined);
  revalidatePath("/workflow");
  revalidatePath("/dashboard");
  return { ok: true, id: workflow.id };
}

/**
 * Ask the AI to augment an existing (or empty) workflow: it adds only the blocks
 * and connections that are missing or clearly better, merging them in-place
 * without touching the Architect's existing blocks.
 */
export async function augmentWorkflow(input: {
  id: string;
  instruction: string;
}): Promise<{
  ok: boolean;
  added?: number;
  ai?: boolean;
  nodes?: WorkflowNodeData[];
  edges?: WorkflowEdge[];
  error?: string;
}> {
  const user = await requireUser();
  const instruction = input.instruction.trim();
  if (instruction.length < 3) {
    return { ok: false, error: "Опишите, что дополнить, Архитектор." };
  }

  const existing = await prisma.workflow.findFirst({
    where: { id: input.id, userId: user.id },
    include: { nodes: true },
  });
  if (!existing) return { ok: false, error: "Воркфлоу не найден." };

  // Stable per-node key the model can reference in edges.
  const nodeKey = (id: string, type: string) => `${type}_${id.slice(-4)}`;
  const idByKey = new Map<string, string>();
  for (const n of existing.nodes) idByKey.set(nodeKey(n.id, n.type), n.id);

  const res = await augmentArchitecture({
    name: existing.name,
    description: existing.description ?? "",
    goal: existing.goal ?? "",
    current: existing.nodes.map((n) => ({
      key: nodeKey(n.id, n.type),
      type: n.type,
      label: n.label,
      tech: n.tech ?? "",
      description: n.description ?? "",
    })),
    instruction,
  });

  if (!res) {
    return { ok: false, error: "Модель недоступна — попробуйте ещё раз." };
  }
  if (res.added.nodes.length === 0 && res.added.edges.length === 0) {
    return { ok: true, added: 0, ai: res.ai, nodes: [], edges: [] };
  }

  const baseY = existing.nodes.reduce((m, n) => Math.max(m, n.posY), 0) + 200;
  const createdNodes: WorkflowNodeData[] = [];
  for (let i = 0; i < res.added.nodes.length; i++) {
    const n = res.added.nodes[i];
    const pos = layout(i, n.type);
    const created = await prisma.workflowNode.create({
      data: {
        workflowId: existing.id,
        type: n.type,
        label: n.label,
        description: n.description,
        tech: n.tech,
        tasks: n.tasks,
        posX: pos.x,
        posY: existing.nodes.length ? baseY + pos.y : pos.y,
        color: blockMeta(n.type).color,
      },
    });
    idByKey.set(n.key, created.id);
    createdNodes.push({
      id: created.id,
      type: created.type,
      label: created.label,
      description: created.description ?? "",
      notes: created.notes ?? "",
      tech: created.tech ?? "",
      tasks: Array.isArray(created.tasks) ? (created.tasks as unknown as string[]) : [],
      posX: created.posX,
      posY: created.posY,
      color: created.color ?? blockMeta(created.type).color,
    });
  }

  const prevEdges = Array.isArray(existing.edges)
    ? (existing.edges as unknown as WorkflowEdge[])
    : [];
  const existingPairs = new Set(prevEdges.map((e) => `${e.source}->${e.target}`));
  const newEdges = res.added.edges
    .map((e) => {
      const source = idByKey.get(e.from);
      const target = idByKey.get(e.to);
      return source && target
        ? { id: `${source}-${target}`, source, target }
        : null;
    })
    .filter((e): e is WorkflowEdge => e !== null)
    .filter((e) => !existingPairs.has(`${e.source}->${e.target}`));

  await prisma.workflow.update({
    where: { id: existing.id },
    data: { edges: [...prevEdges, ...newEdges] as unknown as object },
  });

  await prisma.activity
    .create({
      data: {
        userId: user.id,
        type: "workflow.augment",
        entity: "workflow",
        entityId: existing.id,
        meta: { added: res.added.nodes.length, instruction: instruction.slice(0, 200) },
      },
    })
    .catch(() => undefined);

  revalidatePath("/workflow");
  return {
    ok: true,
    added: res.added.nodes.length,
    ai: res.ai,
    nodes: createdNodes,
    edges: newEdges,
  };
}

export async function deleteWorkflow(id: string): Promise<{ ok: boolean }> {
  const user = await requireUser();
  const res = await prisma.workflow.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/workflow");
  revalidatePath("/dashboard");
  return { ok: res.count > 0 };
}
