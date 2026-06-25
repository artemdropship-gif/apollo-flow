"use client";

import { useState, useTransition } from "react";
import { Loader2, MapPin, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { CITIES, NICHES } from "@/lib/constants";
import { searchLeads } from "@/features/leads/actions";
import { ResultCard } from "@/features/leads/components/result-card";
import type { LeadCandidate } from "@/features/leads/types";

export function SearchPanel() {
  const [city, setCity] = useState("");
  const [niche, setNiche] = useState("");
  const [candidates, setCandidates] = useState<LeadCandidate[] | null>(null);
  const [area, setArea] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!city.trim() || !niche.trim()) {
      toast.error("Укажите город и нишу");
      return;
    }
    startTransition(async () => {
      try {
        const res = await searchLeads({ city, niche });
        setCandidates(res.candidates);
        setArea(res.area);
        if (!res.candidates.length) {
          toast.message("Ничего не найдено", {
            description: "Попробуйте другой город или нишу.",
          });
        }
      } catch {
        toast.error("Ошибка поиска. Попробуйте ещё раз.");
      }
    });
  }

  return (
    <div className="space-y-5">
      <Card className="glass">
        <CardContent className="p-4">
          <form
            onSubmit={handleSearch}
            className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]"
          >
            <div className="space-y-1.5">
              <Label htmlFor="city">Город</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Москва"
                list="city-suggestions"
                autoComplete="off"
              />
              <datalist id="city-suggestions">
                {CITIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="niche">Ниша</Label>
              <Input
                id="niche"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                placeholder="Стоматология"
                list="niche-suggestions"
                autoComplete="off"
              />
              <datalist id="niche-suggestions">
                {NICHES.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            </div>
            <Button
              type="submit"
              disabled={pending}
              className="w-full sm:w-auto"
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Search className="size-4" />
              )}
              Найти
            </Button>
          </form>
        </CardContent>
      </Card>

      {pending && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-xl" />
          ))}
        </div>
      )}

      {!pending && candidates && candidates.length > 0 && (
        <>
          <p className="text-sm text-muted-foreground">
            <MapPin className="mr-1 inline size-3.5" />
            Найдено {candidates.length} в «{area}» — отсортировано по Lead Score
          </p>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {candidates.map((c, i) => (
              <ResultCard key={`${c.name}-${i}`} candidate={c} />
            ))}
          </div>
        </>
      )}

      {!pending && candidates && candidates.length === 0 && (
        <EmptyState
          icon={Search}
          title="Ничего не найдено"
          description="Проверьте написание города и ниши или попробуйте более общий запрос (например, «Кафе»)."
        />
      )}

      {!pending && !candidates && (
        <EmptyState
          icon={Search}
          title="Начните поиск клиентов"
          description="Введите город и нишу — система найдёт компании на OpenStreetMap, проверит сайты, рассчитает Lead Score и предложит, кому писать в первую очередь."
        />
      )}
    </div>
  );
}
