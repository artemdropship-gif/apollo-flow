"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import type { LeadStatus } from "@prisma/client";
import { KanbanSquare } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";
import { LEAD_STATUSES, LEAD_STATUS_MAP } from "@/lib/constants";
import type { SavedLead } from "@/features/leads/types";
import { moveLead } from "@/features/pipeline/actions";
import { PipelineCard } from "@/features/pipeline/components/pipeline-card";

export function PipelineBoard({ leads }: { leads: SavedLead[] }) {
  const [items, setItems] = useState<SavedLead[]>(leads);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStatus, setOverStatus] = useState<LeadStatus | null>(null);
  const [, startTransition] = useTransition();

  const byStatus = useMemo(() => {
    const map = new Map<LeadStatus, SavedLead[]>();
    for (const status of LEAD_STATUSES) map.set(status.value, []);
    for (const lead of items) map.get(lead.status)?.push(lead);
    return map;
  }, [items]);

  function handleDrop(status: LeadStatus) {
    const id = dragId;
    setOverStatus(null);
    setDragId(null);
    if (!id) return;

    const lead = items.find((item) => item.id === id);
    if (!lead || lead.status === status) return;

    const previous = items;
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, status } : item)),
    );

    startTransition(async () => {
      try {
        await moveLead(id, status);
        toast.success(`Перемещено → ${LEAD_STATUS_MAP[status].label}`);
      } catch {
        setItems(previous);
        toast.error("Не удалось обновить статус");
      }
    });
  }

  if (!items.length) {
    return (
      <EmptyState
        icon={KanbanSquare}
        title="Воронка пуста"
        description="Сохраните лиды в Leads Finder — они появятся здесь карточками, и их можно будет перетаскивать между статусами."
        action={
          <Button render={<Link href="/leads" />}>Открыть Leads Finder</Button>
        }
      />
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {LEAD_STATUSES.map((column) => {
        const cards = byStatus.get(column.value) ?? [];
        const isOver = overStatus === column.value;
        return (
          <section
            key={column.value}
            onDragOver={(event) => {
              event.preventDefault();
              if (overStatus !== column.value) setOverStatus(column.value);
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                setOverStatus((current) =>
                  current === column.value ? null : current,
                );
              }
            }}
            onDrop={() => handleDrop(column.value)}
            className={cn(
              "flex w-72 shrink-0 flex-col rounded-xl border border-border/60 bg-muted/30 transition-colors",
              isOver && "border-primary/70 bg-primary/5",
            )}
          >
            <header className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: column.color }}
                />
                <span className="text-sm font-medium">{column.label}</span>
              </div>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
                {cards.length}
              </span>
            </header>

            <div className="flex min-h-32 flex-1 flex-col gap-2 p-2">
              {cards.map((lead) => (
                <PipelineCard
                  key={lead.id}
                  lead={lead}
                  dragging={dragId === lead.id}
                  onDragStart={() => setDragId(lead.id)}
                  onDragEnd={() => setDragId(null)}
                />
              ))}
              {!cards.length && (
                <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border/60 px-3 py-6 text-center text-xs text-muted-foreground">
                  Перетащите лид сюда
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
