"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { saveLead } from "@/features/leads/actions";
import { ContactLinks } from "@/features/leads/components/contact-links";
import { ScoreBadge } from "@/features/leads/components/score-badge";
import { TemperatureBadge } from "@/features/leads/components/temperature-badge";
import type { LeadCandidate } from "@/features/leads/types";

export function ResultCard({ candidate }: { candidate: LeadCandidate }) {
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      try {
        const res = await saveLead(candidate);
        setSaved(true);
        toast.success(
          res.duplicate ? "Лид уже сохранён" : "Лид сохранён в CRM",
        );
      } catch {
        toast.error("Не удалось сохранить лид");
      }
    });
  }

  const reasons = candidate.scoreReasons.filter((r) => r.points > 0);

  return (
    <Card className="glass">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-semibold">{candidate.name}</h3>
            <p className="text-xs text-muted-foreground">
              {candidate.websiteStatus}
              {candidate.isChain && " · сеть"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <TemperatureBadge
              score={candidate.leadScore}
              noWebsite={!candidate.audit.hasWebsite}
              broken={candidate.audit.broken}
            />
            <ScoreBadge score={candidate.leadScore} />
          </div>
        </div>

        <ContactLinks
          address={candidate.address}
          phone={candidate.phone}
          email={candidate.email}
          website={candidate.website}
          socials={candidate.socials}
        />

        {reasons.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {reasons.map((r) => (
              <Badge key={r.reason} variant="outline" className="text-xs">
                {r.reason} +{r.points}
              </Badge>
            ))}
          </div>
        )}

        <p className="text-sm text-muted-foreground">
          {candidate.recommendations}
        </p>

        <Button
          size="sm"
          variant={saved ? "outline" : "default"}
          disabled={pending || saved}
          onClick={handleSave}
          className="w-full"
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : saved ? (
            <Check className="size-4" />
          ) : (
            <Plus className="size-4" />
          )}
          {saved ? "Сохранён" : "Сохранить лид"}
        </Button>
      </CardContent>
    </Card>
  );
}
