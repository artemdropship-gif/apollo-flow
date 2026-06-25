"use client";

import { useMemo, useState } from "react";
import type { LeadStatus } from "@prisma/client";
import { Flame, Inbox, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state";
import { LEAD_STATUSES } from "@/lib/constants";
import { SavedLeadCard } from "@/features/leads/components/saved-lead-card";
import type { ProjectOption } from "@/features/projects/actions";
import type { SavedLead } from "@/features/leads/types";

type Filter = "ALL" | "FAVORITE" | "HOT" | LeadStatus;

const HOT_THRESHOLD = 65;

export function SavedPanel({
  leads,
  projects,
}: {
  leads: SavedLead[];
  projects: ProjectOption[];
}) {
  const [filter, setFilter] = useState<Filter>("ALL");
  const [query, setQuery] = useState("");

  const hotCount = useMemo(
    () => leads.filter((l) => l.leadScore >= HOT_THRESHOLD).length,
    [leads],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const result = leads.filter((lead) => {
      if (filter === "FAVORITE" && !lead.favorite) return false;
      if (filter === "HOT" && lead.leadScore < HOT_THRESHOLD) return false;
      if (
        filter !== "ALL" &&
        filter !== "FAVORITE" &&
        filter !== "HOT" &&
        lead.status !== filter
      )
        return false;
      if (q && !lead.name.toLowerCase().includes(q)) return false;
      return true;
    });
    // Hottest first when looking at the hot bucket.
    if (filter === "HOT") result.sort((a, b) => b.leadScore - a.leadScore);
    return result;
  }, [leads, filter, query]);

  if (!leads.length) {
    return (
      <EmptyState
        icon={Inbox}
        title="Пока нет сохранённых лидов"
        description="Запустите поиск во вкладке «Поиск» и сохраните интересные компании — они появятся здесь с управлением статусами и генерацией сообщений."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск по названию…"
          className="max-w-xs"
        />
        <div className="flex flex-wrap gap-1.5">
          <FilterButton active={filter === "ALL"} onClick={() => setFilter("ALL")}>
            Все ({leads.length})
          </FilterButton>
          <FilterButton
            active={filter === "FAVORITE"}
            onClick={() => setFilter("FAVORITE")}
          >
            <Star className="size-3.5" />
            Избранное
          </FilterButton>
          {hotCount > 0 && (
            <FilterButton
              active={filter === "HOT"}
              onClick={() => setFilter("HOT")}
            >
              <Flame className="size-3.5" />
              Горячие ({hotCount})
            </FilterButton>
          )}
          {LEAD_STATUSES.map((s) => {
            const count = leads.filter((l) => l.status === s.value).length;
            if (!count) return null;
            return (
              <FilterButton
                key={s.value}
                active={filter === s.value}
                onClick={() => setFilter(s.value)}
              >
                {s.label} ({count})
              </FilterButton>
            );
          })}
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((lead) => (
            <SavedLeadCard key={lead.id} lead={lead} projects={projects} />
          ))}
        </div>
      ) : (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Нет лидов по этому фильтру.
        </p>
      )}
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "default" : "outline"}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
