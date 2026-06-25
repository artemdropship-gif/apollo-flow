import { prisma } from "@/lib/db";
import type {
  LeadSocials,
  SavedLead,
  ScoreReason,
} from "@/features/leads/types";

export async function getSavedLeads(userId: string): Promise<SavedLead[]> {
  const leads = await prisma.lead.findMany({
    where: { userId },
    orderBy: [{ leadScore: "desc" }, { createdAt: "desc" }],
  });

  return leads.map((lead) => ({
    ...lead,
    scoreReasons: (lead.scoreReasons as ScoreReason[] | null) ?? null,
    socials: (lead.socials as LeadSocials | null) ?? null,
  }));
}
