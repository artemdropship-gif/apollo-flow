"use server";

import { revalidatePath } from "next/cache";
import type { LeadStatus, MessageChannel } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { searchBusinesses } from "@/lib/maps/osm";
import { auditWebsite, type WebsiteAudit } from "@/lib/audit/website";
import { computeLeadScore, scorePriority } from "@/lib/score";
import { generateMessage } from "@/lib/ai/messages";
import type {
  LeadCandidate,
  LeadSocials,
  ScoreReason,
  SearchResult,
} from "@/features/leads/types";

const AUDIT_CONCURRENCY = 6;

function buildRecommendations(
  reasons: ScoreReason[],
  audit: WebsiteAudit,
  score: number,
): string {
  const priority = scorePriority(score).label.toLowerCase();
  const issues = reasons.filter((r) => r.points > 0).map((r) => r.reason);

  if (!issues.length) {
    return audit.hasWebsite
      ? `Сайт в хорошем состоянии — приоритет ${priority}. Можно предложить доработки и поддержку.`
      : `Приоритет ${priority}.`;
  }

  const lead = !audit.hasWebsite
    ? "У бизнеса нет сайта — это лучшая точка входа: предложите создание сайта с формами заявок."
    : audit.broken
      ? "Сайт не открывается — предложите быстрый перезапуск на современном стеке."
      : "Сайт можно заметно улучшить.";

  return `${lead} Слабые места: ${issues.join(", ").toLowerCase()}. Приоритет ${priority}.`;
}

async function auditInBatches(
  websites: (string | null)[],
): Promise<WebsiteAudit[]> {
  const results: WebsiteAudit[] = new Array(websites.length);
  for (let i = 0; i < websites.length; i += AUDIT_CONCURRENCY) {
    const slice = websites.slice(i, i + AUDIT_CONCURRENCY);
    const audited = await Promise.all(slice.map((w) => auditWebsite(w)));
    audited.forEach((a, j) => {
      results[i + j] = a;
    });
  }
  return results;
}

export async function searchLeads(input: {
  city: string;
  niche: string;
  limit?: number;
}): Promise<SearchResult> {
  await requireUser();

  const city = input.city.trim();
  const niche = input.niche.trim();
  if (!city || !niche) {
    return { area: null, candidates: [] };
  }

  const limit = Math.min(Math.max(input.limit ?? 15, 1), 30);
  const { results, area } = await searchBusinesses({ city, niche, limit });

  const audits = await auditInBatches(results.map((r) => r.website));

  const candidates: LeadCandidate[] = results.map((biz, i) => {
    const audit = audits[i];
    const { score, reasons } = computeLeadScore({
      audit,
      reviewsCount: null,
    });
    const websiteStatus = !audit.hasWebsite
      ? "Нет сайта"
      : audit.broken
        ? "Не открывается"
        : audit.modern
          ? "Современный"
          : "Требует доработки";

    return {
      name: biz.name,
      niche,
      city,
      address: biz.address,
      phone: biz.phone,
      email: biz.email,
      website: biz.website,
      workingHours: biz.workingHours,
      socials: biz.socials,
      isChain: biz.isChain,
      lat: biz.lat,
      lng: biz.lng,
      source: biz.source,
      websiteStatus,
      leadScore: score,
      scoreReasons: reasons,
      audit,
      recommendations: buildRecommendations(reasons, audit, score),
    };
  });

  candidates.sort((a, b) => b.leadScore - a.leadScore);

  return { area: area?.displayName ?? city, candidates };
}

export async function saveLead(
  candidate: LeadCandidate,
): Promise<{ id: string; duplicate: boolean }> {
  const user = await requireUser();

  const existing = await prisma.lead.findFirst({
    where: {
      userId: user.id,
      name: candidate.name,
      city: candidate.city,
    },
    select: { id: true },
  });
  if (existing) return { id: existing.id, duplicate: true };

  const lead = await prisma.lead.create({
    data: {
      userId: user.id,
      name: candidate.name,
      niche: candidate.niche,
      city: candidate.city,
      address: candidate.address,
      phone: candidate.phone,
      email: candidate.email,
      website: candidate.website,
      workingHours: candidate.workingHours,
      socials: candidate.socials as unknown as object,
      lat: candidate.lat,
      lng: candidate.lng,
      source: candidate.source,
      websiteStatus: candidate.websiteStatus,
      leadScore: candidate.leadScore,
      scoreReasons: candidate.scoreReasons as unknown as object,
      aiAudit: candidate.audit as unknown as object,
      aiRecommendations: candidate.recommendations,
    },
    select: { id: true },
  });

  await prisma.activity.create({
    data: {
      userId: user.id,
      type: "lead.saved",
      entity: "lead",
      entityId: lead.id,
      meta: { name: candidate.name, score: candidate.leadScore },
    },
  });

  revalidatePath("/leads");
  return { id: lead.id, duplicate: false };
}

export async function updateLeadStatus(
  id: string,
  status: LeadStatus,
): Promise<void> {
  const user = await requireUser();
  await prisma.lead.updateMany({
    where: { id, userId: user.id },
    data: {
      status,
      contacted: status !== "NEW",
      isClient: status === "CLIENT",
    },
  });
  revalidatePath("/leads");
}

export async function toggleLeadFavorite(
  id: string,
  favorite: boolean,
): Promise<void> {
  const user = await requireUser();
  await prisma.lead.updateMany({
    where: { id, userId: user.id },
    data: { favorite },
  });
  revalidatePath("/leads");
}

export async function setLeadComment(
  id: string,
  comment: string,
): Promise<void> {
  const user = await requireUser();
  await prisma.lead.updateMany({
    where: { id, userId: user.id },
    data: { comment: comment.trim() || null },
  });
  revalidatePath("/leads");
}

export async function deleteLead(id: string): Promise<void> {
  const user = await requireUser();
  await prisma.lead.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/leads");
}

export interface LeadEditInput {
  name: string;
  niche: string | null;
  city: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  workingHours: string | null;
  socials: LeadSocials;
  comment: string | null;
}

function cleanSocials(socials: LeadSocials): LeadSocials {
  const out: LeadSocials = {};
  for (const [k, v] of Object.entries(socials)) {
    if (v && v.trim()) out[k as keyof LeadSocials] = v.trim();
  }
  return out;
}

export async function editLead(
  id: string,
  input: LeadEditInput,
): Promise<void> {
  const user = await requireUser();
  const name = input.name.trim();
  if (!name) throw new Error("Имя обязательно");

  await prisma.lead.updateMany({
    where: { id, userId: user.id },
    data: {
      name,
      niche: input.niche?.trim() || null,
      city: input.city?.trim() || null,
      address: input.address?.trim() || null,
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      website: input.website?.trim() || null,
      workingHours: input.workingHours?.trim() || null,
      socials: cleanSocials(input.socials) as unknown as object,
      comment: input.comment?.trim() || null,
    },
  });
  revalidatePath("/leads");
}

export async function createLeadManually(
  input: LeadEditInput,
): Promise<{ id: string }> {
  const user = await requireUser();
  const name = input.name.trim();
  if (!name) throw new Error("Имя обязательно");

  const lead = await prisma.lead.create({
    data: {
      userId: user.id,
      name,
      niche: input.niche?.trim() || null,
      city: input.city?.trim() || null,
      address: input.address?.trim() || null,
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      website: input.website?.trim() || null,
      workingHours: input.workingHours?.trim() || null,
      socials: cleanSocials(input.socials) as unknown as object,
      comment: input.comment?.trim() || null,
      source: "manual",
      websiteStatus: input.website?.trim() ? "Есть сайт" : "Нет сайта",
    },
    select: { id: true },
  });

  await prisma.activity.create({
    data: {
      userId: user.id,
      type: "lead.created",
      entity: "lead",
      entityId: lead.id,
      meta: { name },
    },
  });

  revalidatePath("/leads");
  return { id: lead.id };
}

export async function attachLeadProject(
  id: string,
  projectId: string | null,
): Promise<void> {
  const user = await requireUser();
  if (projectId) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: user.id },
      select: { id: true },
    });
    if (!project) throw new Error("Проект не найден");
  }
  await prisma.lead.updateMany({
    where: { id, userId: user.id },
    data: { projectId },
  });
  revalidatePath("/leads");
}

export async function generateLeadMessage(
  id: string,
  channel: MessageChannel,
): Promise<{ content: string }> {
  const user = await requireUser();
  const lead = await prisma.lead.findFirst({
    where: { id, userId: user.id },
  });
  if (!lead) throw new Error("Лид не найден");

  const content = await generateMessage(
    {
      name: lead.name,
      niche: lead.niche,
      website: lead.website,
      scoreReasons: lead.scoreReasons as ScoreReason[] | null,
    },
    channel,
  );

  await prisma.contactMessage.create({
    data: { leadId: lead.id, channel, content },
  });

  revalidatePath("/leads");
  return { content };
}
