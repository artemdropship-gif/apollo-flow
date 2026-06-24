"use client";

import { useState } from "react";
import { Bookmark, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchPanel } from "@/features/leads/components/search-panel";
import { SavedPanel } from "@/features/leads/components/saved-panel";
import type { SavedLead } from "@/features/leads/types";

export function LeadsClient({ savedLeads }: { savedLeads: SavedLead[] }) {
  const [tab, setTab] = useState<"search" | "saved">("search");

  return (
    <div className="space-y-5">
      <div className="flex gap-1.5">
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
      </div>

      {tab === "search" ? (
        <SearchPanel />
      ) : (
        <SavedPanel leads={savedLeads} />
      )}
    </div>
  );
}
