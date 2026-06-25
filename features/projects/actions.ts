"use server";

import { revalidatePath } from "next/cache";
import type { ProjectStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";

export interface ProjectOption {
  id: string;
  name: string;
  status: ProjectStatus;
  client: string | null;
}

export interface ProjectSummary extends ProjectOption {
  description: string | null;
  deadline: string | null;
  updatedAt: string;
  counts: {
    leads: number;
    workflows: number;
    vaultItems: number;
    notes: number;
    tasks: number;
    tasksDone: number;
  };
}

export async function getProjects(): Promise<ProjectOption[]> {
  const user = await requireUser();
  const projects = await prisma.project.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, status: true, client: true },
  });
  return projects;
}

export async function getProjectsSummary(): Promise<ProjectSummary[]> {
  const user = await requireUser();
  const projects = await prisma.project.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: {
        select: {
          leads: true,
          workflows: true,
          vaultItems: true,
          notes: true,
          tasks: true,
        },
      },
      tasks: { where: { done: true }, select: { id: true } },
    },
  });
  return projects.map((p) => ({
    id: p.id,
    name: p.name,
    status: p.status,
    client: p.client,
    description: p.description,
    deadline: p.deadline ? p.deadline.toISOString() : null,
    updatedAt: p.updatedAt.toISOString(),
    counts: {
      leads: p._count.leads,
      workflows: p._count.workflows,
      vaultItems: p._count.vaultItems,
      notes: p._count.notes,
      tasks: p._count.tasks,
      tasksDone: p.tasks.length,
    },
  }));
}

export async function createProject(input: {
  name: string;
  description?: string | null;
  client?: string | null;
  status?: ProjectStatus;
}): Promise<{ id: string }> {
  const user = await requireUser();
  const name = input.name.trim();
  if (!name) throw new Error("Название обязательно");

  const project = await prisma.project.create({
    data: {
      userId: user.id,
      name,
      description: input.description?.trim() || null,
      client: input.client?.trim() || null,
      status: input.status ?? "ACTIVE",
    },
    select: { id: true },
  });

  revalidatePath("/leads");
  revalidatePath("/projects");
  return { id: project.id };
}

export async function updateProject(
  id: string,
  input: {
    name?: string;
    description?: string | null;
    client?: string | null;
    context?: string | null;
    deadline?: string | null;
    status?: ProjectStatus;
  },
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  const existing = await prisma.project.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "Проект не найден" };

  await prisma.project.update({
    where: { id },
    data: {
      ...(input.name !== undefined
        ? { name: input.name.trim() || "Без названия" }
        : {}),
      ...(input.description !== undefined
        ? { description: input.description?.trim() || null }
        : {}),
      ...(input.client !== undefined
        ? { client: input.client?.trim() || null }
        : {}),
      ...(input.context !== undefined
        ? { context: input.context?.trim() || null }
        : {}),
      ...(input.deadline !== undefined
        ? { deadline: input.deadline ? new Date(input.deadline) : null }
        : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
    },
  });
  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);
  return { ok: true };
}

export async function deleteProject(id: string): Promise<{ ok: boolean }> {
  const user = await requireUser();
  await prisma.project.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/projects");
  return { ok: true };
}

export interface TaskView {
  id: string;
  title: string;
  done: boolean;
  order: number;
}

export interface AttachableItem {
  id: string;
  label: string;
  meta?: string | null;
  attached: boolean;
}

export interface ProjectDetail {
  id: string;
  name: string;
  description: string | null;
  client: string | null;
  context: string | null;
  status: ProjectStatus;
  deadline: string | null;
  tasks: TaskView[];
  leads: AttachableItem[];
  workflows: AttachableItem[];
  vaultItems: AttachableItem[];
  notes: AttachableItem[];
}

export async function getProjectDetail(
  id: string,
): Promise<ProjectDetail | null> {
  const user = await requireUser();
  const project = await prisma.project.findFirst({
    where: { id, userId: user.id },
    include: { tasks: { orderBy: { order: "asc" } } },
  });
  if (!project) return null;

  const [leads, workflows, vaultItems, notes] = await Promise.all([
    prisma.lead.findMany({
      where: { userId: user.id, OR: [{ projectId: id }, { projectId: null }] },
      select: { id: true, name: true, niche: true, projectId: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.workflow.findMany({
      where: { userId: user.id, OR: [{ projectId: id }, { projectId: null }] },
      select: { id: true, name: true, goal: true, projectId: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.vaultItem.findMany({
      where: { userId: user.id, OR: [{ projectId: id }, { projectId: null }] },
      select: { id: true, label: true, category: true, projectId: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.note.findMany({
      where: { userId: user.id, OR: [{ projectId: id }, { projectId: null }] },
      select: { id: true, title: true, projectId: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return {
    id: project.id,
    name: project.name,
    description: project.description,
    client: project.client,
    context: project.context,
    status: project.status,
    deadline: project.deadline ? project.deadline.toISOString() : null,
    tasks: project.tasks.map((t) => ({
      id: t.id,
      title: t.title,
      done: t.done,
      order: t.order,
    })),
    leads: leads.map((l) => ({
      id: l.id,
      label: l.name,
      meta: l.niche,
      attached: l.projectId === id,
    })),
    workflows: workflows.map((w) => ({
      id: w.id,
      label: w.name,
      meta: w.goal,
      attached: w.projectId === id,
    })),
    vaultItems: vaultItems.map((v) => ({
      id: v.id,
      label: v.label,
      meta: v.category,
      attached: v.projectId === id,
    })),
    notes: notes.map((n) => ({
      id: n.id,
      label: n.title,
      meta: null,
      attached: n.projectId === id,
    })),
  };
}

type Attachable = "lead" | "workflow" | "vault" | "note";

export async function setProjectLink(
  kind: Attachable,
  itemId: string,
  projectId: string | null,
): Promise<{ ok: boolean }> {
  const user = await requireUser();
  const data = { projectId };
  const where = { id: itemId, userId: user.id };
  if (kind === "lead") await prisma.lead.updateMany({ where, data });
  else if (kind === "workflow")
    await prisma.workflow.updateMany({ where, data });
  else if (kind === "vault")
    await prisma.vaultItem.updateMany({ where, data });
  else await prisma.note.updateMany({ where, data });

  if (projectId) {
    revalidatePath(`/projects/${projectId}`);
  }
  revalidatePath("/projects");
  return { ok: true };
}

export async function addTask(
  projectId: string,
  title: string,
): Promise<{ ok: boolean; task?: TaskView }> {
  const user = await requireUser();
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: user.id },
    select: { id: true },
  });
  if (!project) return { ok: false };
  const t = title.trim();
  if (!t) return { ok: false };

  const count = await prisma.task.count({ where: { projectId } });
  const task = await prisma.task.create({
    data: { projectId, title: t, order: count },
  });
  revalidatePath(`/projects/${projectId}`);
  return {
    ok: true,
    task: { id: task.id, title: task.title, done: task.done, order: task.order },
  };
}

export async function toggleTask(
  taskId: string,
  done: boolean,
): Promise<{ ok: boolean }> {
  const user = await requireUser();
  const task = await prisma.task.findFirst({
    where: { id: taskId, project: { userId: user.id } },
    select: { id: true, projectId: true },
  });
  if (!task) return { ok: false };
  await prisma.task.update({ where: { id: taskId }, data: { done } });
  revalidatePath(`/projects/${task.projectId}`);
  return { ok: true };
}

export async function deleteTask(taskId: string): Promise<{ ok: boolean }> {
  const user = await requireUser();
  const task = await prisma.task.findFirst({
    where: { id: taskId, project: { userId: user.id } },
    select: { id: true, projectId: true },
  });
  if (!task) return { ok: false };
  await prisma.task.delete({ where: { id: taskId } });
  revalidatePath(`/projects/${task.projectId}`);
  return { ok: true };
}
