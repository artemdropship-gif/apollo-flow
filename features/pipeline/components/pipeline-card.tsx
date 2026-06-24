"use client";

import { MapPin, Phone, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { LEAD_STATUS_MAP } from "@/lib/constants";
import { ScoreBadge } from "@/features/leads/components/score-badge";
import type { SavedLead } from "@/features/leads/types";

export function PipelineCard({
  lead,
  dragging,
  onDragStart,
  onDragEnd,
}: {
  lead: SavedLead;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const accent = LEAD_STATUS_MAP[lead.status]?.color;
  return (
    <article
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", lead.id);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      aria-grabbed={dragging}
      style={{ borderLeftColor: accent }}
      className={cn(
        "cursor-grab rounded-md border border-border border-l-2 bg-card p-3 text-sm transition-colors active:cursor-grabbing hover:border-foreground/20",
        dragging && "opacity-40",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="min-w-0 truncate font-medium leading-tight">
          {lead.name}
        </h4>
        {lead.favorite && (
          <Star className="size-3.5 shrink-0 fill-amber-400 text-amber-400" />
        )}
      </div>

      <p className="mt-0.5 truncate text-xs text-muted-foreground">
        {[lead.niche, lead.city].filter(Boolean).join(" · ") || "—"}
      </p>

      {(lead.phone || lead.address) && (
        <div className="mt-2 space-y-1 text-xs text-muted-foreground">
          {lead.phone && (
            <p className="flex items-center gap-1.5">
              <Phone className="size-3 shrink-0" />
              {lead.phone}
            </p>
          )}
          {lead.address && (
            <p className="flex items-center gap-1.5">
              <MapPin className="size-3 shrink-0" />
              <span className="truncate">{lead.address}</span>
            </p>
          )}
        </div>
      )}

      <div className="mt-2.5 border-t border-border/60 pt-2.5">
        <ScoreBadge score={lead.leadScore} />
      </div>
    </article>
  );
}
