"use client";

import { ExternalLink, Globe, Mail, MapPin, Phone } from "lucide-react";
import type { LeadSocials } from "@/features/leads/types";

const SOCIAL_META: { key: keyof LeadSocials; label: string }[] = [
  { key: "telegram", label: "Telegram" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "instagram", label: "Instagram" },
  { key: "vk", label: "VK" },
  { key: "facebook", label: "Facebook" },
  { key: "youtube", label: "YouTube" },
];

/** Renders only the contact channels that actually exist, as clickable links. */
export function ContactLinks({
  address,
  phone,
  email,
  website,
  socials,
}: {
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  socials?: LeadSocials | null;
}) {
  const s = socials ?? {};
  const hasSocials = SOCIAL_META.some((m) => s[m.key]);

  return (
    <div className="space-y-1.5 text-sm text-muted-foreground">
      {address && (
        <p className="flex items-center gap-2">
          <MapPin className="size-3.5 shrink-0" />
          <span className="truncate">{address}</span>
        </p>
      )}
      {phone && (
        <p className="flex items-center gap-2">
          <Phone className="size-3.5 shrink-0" />
          <a href={`tel:${phone.replace(/\s+/g, "")}`} className="hover:underline">
            {phone}
          </a>
        </p>
      )}
      {email && (
        <p className="flex items-center gap-2">
          <Mail className="size-3.5 shrink-0" />
          <a href={`mailto:${email}`} className="truncate hover:underline">
            {email}
          </a>
        </p>
      )}
      {website && (
        <p className="flex items-center gap-2">
          <Globe className="size-3.5 shrink-0" />
          <a
            href={website}
            target="_blank"
            rel="noreferrer"
            className="truncate text-primary hover:underline"
          >
            {website.replace(/^https?:\/\//, "")}
          </a>
        </p>
      )}
      {hasSocials && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {SOCIAL_META.map((m) => {
            const url = s[m.key];
            if (!url) return null;
            return (
              <a
                key={m.key}
                href={url}
                target="_blank"
                rel="noreferrer"
                title={url}
                className="inline-flex items-center gap-1 rounded-md border border-input px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:border-ring hover:text-primary"
              >
                {m.label}
                <ExternalLink className="size-3" />
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
