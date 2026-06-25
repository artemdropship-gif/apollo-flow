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

export async function getProjects(): Promise<ProjectOption[]> {
  const user = await requireUser();
  const projects = await prisma.project.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, status: true, client: true },
  });
  return projects;
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
