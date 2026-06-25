"use client";

import { useState } from "react";
import { Bookmark, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchPanel } from "@/features/leads/components/search-panel";
import { SavedPanel } from "@/features/leads/components/saved-panel";
import { LeadEditDialog } from "@/features/leads/components/lead-edit-dialog";
import type { ProjectOption } from "@/features/projects/actions";
import type { SavedLead } from "@/features/leads/types";

export function LeadsClient({
  savedLeads,
  projects,
}: {
  savedLeads: SavedLead[];
  projects: ProjectOption[];
}) {
  const [tab, setTab] = useState<"search" | "saved">("search");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-1.5">
        <Button
          variant={tab === "search" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("search")}
        >
          <Search className="size-4" />
          Поиск
        </Button>
        <Button
          variant={tab === "saved" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("saved")}
        >
          <Bookmark className="size-4" />
          Сохранённые ({savedLeads.length})
        </Button>
        <div className="ms-auto">
          <LeadEditDialog
            projects={projects}
            trigger={
              <Button size="sm">
                <Plus className="size-4" />
                Новый лид
              </Button>
            }
          />
        </div>
      </div>

      {tab === "search" ? (
        <SearchPanel />
      ) : (
        <SavedPanel leads={savedLeads} projects={projects} />
      )}
    </div>
  );
}
