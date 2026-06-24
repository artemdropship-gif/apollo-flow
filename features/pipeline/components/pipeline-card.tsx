"use client";

import { GripVertical, MapPin, Phone, Star } from "lucide-react";
import { cn } from "@/lib/utils";
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
      className={cn(
        "glass group cursor-grab rounded-lg border border-border/60 p-3 text-sm shadow-sm transition-all active:cursor-grabbing hover:border-border hover:shadow-md",
        dragging && "opacity-50",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="truncate font-medium leading-tight">{lead.name}</h4>
          <p className="truncate text-xs text-muted-foreground">
            {[lead.niche, lead.city].filter(Boolean).join(" · ") || "—"}
          </p>
        </div>
        <GripVertical className="size-4 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-muted-foreground" />
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <ScoreBadge score={lead.leadScore} />
        {lead.favorite && (
          <Star className="size-3.5 fill-amber-400 text-amber-400" />
        )}
      </div>

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
    </article>
  );
}
