"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";

export interface NoteView {
  id: string;
  title: string;
  content: string;
  tags: string[];
  folder: string | null;
  pinned: boolean;
  projectId: string | null;
  createdAt: string;
  updatedAt: string;
}

function toView(n: {
  id: string;
  title: string;
  content: string;
  tags: string[];
  folder: string | null;
  pinned: boolean;
  projectId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): NoteView {
  return {
    id: n.id,
    title: n.title,
    content: n.content,
    tags: n.tags,
    folder: n.folder,
    pinned: n.pinned,
    projectId: n.projectId,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
  };
}

export async function getNotes(): Promise<NoteView[]> {
  const user = await requireUser();
  const notes = await prisma.note.findMany({
    where: { userId: user.id },
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
  });
  return notes.map(toView);
}

export async function createNote(input?: {
  title?: string;
  content?: string;
  projectId?: string | null;
}): Promise<{ ok: boolean; note?: NoteView }> {
  const user = await requireUser();
  const note = await prisma.note.create({
    data: {
      userId: user.id,
      title: input?.title?.trim() || "Без названия",
      content: input?.content ?? "",
      projectId: input?.projectId || null,
    },
  });
  revalidatePath("/notes");
  return { ok: true, note: toView(note) };
}

export interface NoteUpdateInput {
  title?: string;
  content?: string;
  tags?: string[];
  folder?: string | null;
  pinned?: boolean;
  projectId?: string | null;
}

export async function updateNote(
  id: string,
  input: NoteUpdateInput,
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  const existing = await prisma.note.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "Заметка не найдена" };

  await prisma.note.update({
    where: { id },
    data: {
      ...(input.title !== undefined
        ? { title: input.title.trim() || "Без названия" }
        : {}),
      ...(input.content !== undefined ? { content: input.content } : {}),
      ...(input.tags !== undefined ? { tags: input.tags } : {}),
      ...(input.folder !== undefined ? { folder: input.folder || null } : {}),
      ...(input.pinned !== undefined ? { pinned: input.pinned } : {}),
      ...(input.projectId !== undefined
        ? { projectId: input.projectId || null }
        : {}),
    },
  });
  revalidatePath("/notes");
  return { ok: true };
}

export async function deleteNote(id: string): Promise<{ ok: boolean }> {
  const user = await requireUser();
  await prisma.note.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/notes");
  return { ok: true };
}
