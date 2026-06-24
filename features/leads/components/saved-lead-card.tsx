"use client";

import { useState, useTransition } from "react";
import type { LeadStatus } from "@prisma/client";
import {
  Globe,
  Loader2,
  MapPin,
  Mail,
  Phone,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { LEAD_STATUSES } from "@/lib/constants";
import {
  deleteLead,
  setLeadComment,
  toggleLeadFavorite,
  updateLeadStatus,
} from "@/features/leads/actions";
import { MessageDialog } from "@/features/leads/components/message-dialog";
import { ScoreBadge } from "@/features/leads/components/score-badge";
import type { SavedLead } from "@/features/leads/types";

export function SavedLeadCard({ lead }: { lead: SavedLead }) {
  const [favorite, setFavorite] = useState(lead.favorite);
  const [status, setStatus] = useState<LeadStatus>(lead.status);
  const [comment, setComment] = useState(lead.comment ?? "");
  const [pending, startTransition] = useTransition();

  function changeStatus(next: LeadStatus) {
    setStatus(next);
    startTransition(async () => {
      await updateLeadStatus(lead.id, next);
      toast.success("Статус обновлён");
    });
  }

  function toggleFav() {
    const next = !favorite;
    setFavorite(next);
    startTransition(() => toggleLeadFavorite(lead.id, next));
  }

  function saveComment() {
    if (comment === (lead.comment ?? "")) return;
    startTransition(async () => {
      await setLeadComment(lead.id, comment);
      toast.success("Комментарий сохранён");
    });
  }

  function remove() {
    startTransition(async () => {
      await deleteLead(lead.id);
      toast.success("Лид удалён");
    });
  }

  return (
    <Card className="glass">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-semibold">{lead.name}</h3>
            <p className="text-xs text-muted-foreground">
              {[lead.niche, lead.city].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <ScoreBadge score={lead.leadScore} />
            <button
              type="button"
              onClick={toggleFav}
              aria-label="В избранное"
              className="text-muted-foreground transition-colors hover:text-amber-400"
            >
              <Star
                className={cn(
                  "size-4",
                  favorite && "fill-amber-400 text-amber-400",
                )}
              />
            </button>
          </div>
        </div>

        <div className="space-y-1 text-sm text-muted-foreground">
          {lead.address && (
            <p className="flex items-center gap-2">
              <MapPin className="size-3.5 shrink-0" />
              <span className="truncate">{lead.address}</span>
            </p>
          )}
          {lead.phone && (
            <p className="flex items-center gap-2">
              <Phone className="size-3.5 shrink-0" />
              {lead.phone}
            </p>
          )}
          {lead.email && (
            <p className="flex items-center gap-2">
              <Mail className="size-3.5 shrink-0" />
              <span className="truncate">{lead.email}</span>
            </p>
          )}
          {lead.website && (
            <p className="flex items-center gap-2">
              <Globe className="size-3.5 shrink-0" />
              <a
                href={lead.website}
                target="_blank"
                rel="noreferrer"
                className="truncate text-primary hover:underline"
              >
                {lead.website.replace(/^https?:\/\//, "")}
              </a>
            </p>
          )}
        </div>

        {lead.aiRecommendations && (
          <p className="text-sm text-muted-foreground">
            {lead.aiRecommendations}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={status}
            onChange={(e) => changeStatus(e.target.value as LeadStatus)}
            disabled={pending}
            className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          >
            {LEAD_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <MessageDialog leadId={lead.id} leadName={lead.name} />
          <Button
            variant="ghost"
            size="sm"
            onClick={remove}
            disabled={pending}
            className="text-muted-foreground hover:text-destructive"
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
          </Button>
        </div>

        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          onBlur={saveComment}
          placeholder="Комментарий…"
          className="min-h-9 resize-none text-sm"
          rows={2}
        />
      </CardContent>
    </Card>
  );
}
