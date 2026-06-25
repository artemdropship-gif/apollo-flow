"use client";

import { useState, useTransition } from "react";
import type { LeadStatus } from "@prisma/client";
import { Loader2, Pencil, Star, Trash2 } from "lucide-react";
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
import { ContactLinks } from "@/features/leads/components/contact-links";
import { LeadEditDialog } from "@/features/leads/components/lead-edit-dialog";
import { MessageDialog } from "@/features/leads/components/message-dialog";
import { ScoreBadge } from "@/features/leads/components/score-badge";
import { TemperatureBadge } from "@/features/leads/components/temperature-badge";
import { siteSignalsFromReasons } from "@/lib/score";
import type { ProjectOption } from "@/features/projects/actions";
import type { SavedLead } from "@/features/leads/types";

export function SavedLeadCard({
  lead,
  projects,
}: {
  lead: SavedLead;
  projects: ProjectOption[];
}) {
  const [favorite, setFavorite] = useState(lead.favorite);
  const [status, setStatus] = useState<LeadStatus>(lead.status);
  const [comment, setComment] = useState(lead.comment ?? "");
  const [pending, startTransition] = useTransition();
  const signals = siteSignalsFromReasons(lead.scoreReasons, lead.website);

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
            <TemperatureBadge
              score={lead.leadScore}
              noWebsite={signals.noWebsite}
              broken={signals.broken}
            />
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

        <ContactLinks
          address={lead.address}
          phone={lead.phone}
          email={lead.email}
          website={lead.website}
          socials={lead.socials}
        />

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
          <MessageDialog
            leadId={lead.id}
            leadName={lead.name}
            phone={lead.phone}
            email={lead.email}
            website={lead.website}
            socials={lead.socials}
          />
          <LeadEditDialog
            lead={lead}
            projects={projects}
            trigger={
              <Button variant="outline" size="sm">
                <Pencil className="size-4" />
                Изменить
              </Button>
            }
          />
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
