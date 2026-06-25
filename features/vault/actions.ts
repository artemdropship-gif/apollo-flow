"use server";

import { revalidatePath } from "next/cache";
import type { VaultItemType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { decryptSecret, encryptSecret } from "@/lib/crypto";

export interface VaultItemView {
  id: string;
  type: VaultItemType;
  category: string | null;
  label: string;
  url: string | null;
  note: string | null;
  hasSecret: boolean;
  projectId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VaultItemInput {
  type: VaultItemType;
  category?: string | null;
  label: string;
  secret?: string | null;
  url?: string | null;
  note?: string | null;
  projectId?: string | null;
}

export async function getVaultItems(): Promise<VaultItemView[]> {
  const user = await requireUser();
  const items = await prisma.vaultItem.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
  });
  return items.map((i) => ({
    id: i.id,
    type: i.type,
    category: i.category,
    label: i.label,
    url: i.url,
    note: i.note,
    hasSecret: Boolean(i.valueEnc),
    projectId: i.projectId,
    createdAt: i.createdAt.toISOString(),
    updatedAt: i.updatedAt.toISOString(),
  }));
}

export async function createVaultItem(
  input: VaultItemInput,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const user = await requireUser();
  const label = input.label.trim();
  if (!label) return { ok: false, error: "Укажите название" };

  let enc: { valueEnc: string; iv: string; authTag: string } | null = null;
  if (input.type === "SECRET" && input.secret?.trim()) {
    try {
      enc = encryptSecret(input.secret.trim());
    } catch {
      return { ok: false, error: "Шифрование недоступно (нет ключа)" };
    }
  }

  const item = await prisma.vaultItem.create({
    data: {
      userId: user.id,
      projectId: input.projectId || null,
      type: input.type,
      category: input.category?.trim() || null,
      label,
      url: input.url?.trim() || null,
      note: input.note?.trim() || null,
      valueEnc: enc?.valueEnc ?? null,
      iv: enc?.iv ?? null,
      authTag: enc?.authTag ?? null,
    },
    select: { id: true },
  });

  revalidatePath("/vault");
  return { ok: true, id: item.id };
}

export async function updateVaultItem(
  id: string,
  input: VaultItemInput,
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  const existing = await prisma.vaultItem.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "Запись не найдена" };

  const label = input.label.trim();
  if (!label) return { ok: false, error: "Укажите название" };

  const data: Record<string, unknown> = {
    projectId: input.projectId || null,
    type: input.type,
    category: input.category?.trim() || null,
    label,
    url: input.url?.trim() || null,
    note: input.note?.trim() || null,
  };

  // Only re-encrypt if a new secret value was provided; empty keeps the old one.
  if (input.type === "SECRET" && input.secret && input.secret.trim()) {
    try {
      const enc = encryptSecret(input.secret.trim());
      data.valueEnc = enc.valueEnc;
      data.iv = enc.iv;
      data.authTag = enc.authTag;
    } catch {
      return { ok: false, error: "Шифрование недоступно (нет ключа)" };
    }
  } else if (input.type === "LINK") {
    data.valueEnc = null;
    data.iv = null;
    data.authTag = null;
  }

  await prisma.vaultItem.update({ where: { id }, data });
  revalidatePath("/vault");
  return { ok: true };
}

export async function deleteVaultItem(
  id: string,
): Promise<{ ok: boolean }> {
  const user = await requireUser();
  await prisma.vaultItem.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/vault");
  return { ok: true };
}

export async function revealSecret(
  id: string,
): Promise<{ ok: boolean; value?: string; error?: string }> {
  const user = await requireUser();
  const item = await prisma.vaultItem.findFirst({
    where: { id, userId: user.id },
    select: { valueEnc: true, iv: true, authTag: true },
  });
  if (!item || !item.valueEnc || !item.iv || !item.authTag) {
    return { ok: false, error: "Секрет отсутствует" };
  }
  try {
    const value = decryptSecret({
      valueEnc: item.valueEnc,
      iv: item.iv,
      authTag: item.authTag,
    });
    return { ok: true, value };
  } catch {
    return { ok: false, error: "Не удалось расшифровать" };
  }
}
