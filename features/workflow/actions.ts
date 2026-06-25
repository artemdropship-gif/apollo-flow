"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  architectureFromText,
  generateArchitecture,
  type GeneratedArchitecture,
} from "@/lib/ai/architecture";
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
  nodes: WorkflowNodeData[];
  edges: WorkflowEdge[];
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
    data: { userId, name: arch.name, description: arch.description },
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

export async function generateWorkflow(
  ideaInput: string,
): Promise<{ ok: boolean; id?: string; ai?: boolean; error?: string }> {
  const user = await requireUser();
  const idea = ideaInput.trim();
  if (idea.length < 3) {
    return { ok: false, error: "Опишите идею подробнее, Архитектор." };
  }

  const { architecture, ai } = await generateArchitecture(idea);
  const id = await persistArchitecture(user.id, architecture);

  await prisma.activity
    .create({
      data: {
        userId: user.id,
        type: "workflow.generate",
        entity: "workflow",
        entityId: id,
        meta: { idea: idea.slice(0, 200), ai },
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
    markdown: toMarkdownExport(data),
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
      data: { edges: data.edges as unknown as object },
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

export async function deleteWorkflow(id: string): Promise<{ ok: boolean }> {
  const user = await requireUser();
  const res = await prisma.workflow.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/workflow");
  revalidatePath("/dashboard");
  return { ok: res.count > 0 };
}
