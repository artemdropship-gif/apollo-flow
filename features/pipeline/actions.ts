"use server";

import { revalidatePath } from "next/cache";
import type { LeadStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";

export async function moveLead(
  id: string,
  status: LeadStatus,
): Promise<void> {
  const user = await requireUser();

  const result = await prisma.lead.updateMany({
    where: { id, userId: user.id },
    data: {
      status,
      contacted: status !== "NEW",
      isClient: status === "CLIENT",
    },
  });

  if (result.count > 0) {
    await prisma.activity.create({
      data: {
        userId: user.id,
        type: "lead.status",
        entity: "lead",
        entityId: id,
        meta: { status },
      },
    });
  }

  revalidatePath("/pipeline");
  revalidatePath("/leads");
  revalidatePath("/dashboard");
}
