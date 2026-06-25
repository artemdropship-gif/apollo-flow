import type { Lead, MessageChannel } from "@prisma/client";
import type { WebsiteAudit } from "@/lib/audit/website";
import type { LeadSocials } from "@/lib/maps/osm";

export type { LeadSocials };

export interface ScoreReason {
  reason: string;
  points: number;
}

/** A scored business candidate produced by a search, not yet persisted. */
export interface LeadCandidate {
  name: string;
  niche: string | null;
  city: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  workingHours: string | null;
  socials: LeadSocials;
  isChain: boolean;
  lat: number | null;
  lng: number | null;
  source: string;
  websiteStatus: string;
  leadScore: number;
  scoreReasons: ScoreReason[];
  audit: WebsiteAudit;
  recommendations: string;
}

export interface SearchResult {
  area: string | null;
  candidates: LeadCandidate[];
}

export type SavedLead = Omit<Lead, "scoreReasons" | "socials"> & {
  scoreReasons: ScoreReason[] | null;
  socials: LeadSocials | null;
};

export const MESSAGE_CHANNELS: { value: MessageChannel; label: string }[] = [
  { value: "TELEGRAM", label: "Telegram" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "EMAIL", label: "Письмо" },
  { value: "PROPOSAL", label: "КП" },
];
