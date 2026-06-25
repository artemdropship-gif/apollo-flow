"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FilePlus2, Sparkles, Trash2, Workflow as WorkflowIcon } from "lucide-react";
import { toast } from "sonner";
import { ApolloCore } from "@/components/layout/apollo-core";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";
import {
  createEmptyWorkflow,
  deleteWorkflow,
  generateWorkflow,
  type WorkflowDetail,
  type WorkflowLeadOption,
  type WorkflowSummary,
} from "@/features/workflow/actions";
import { WorkflowCanvas } from "./workflow-canvas";
import { ExportDialog, ImportDialog } from "./import-export";

const IDEAS = [
  "CRM для стоматологии",
  "Лендинг для барбершопа с записью",
  "Маркетплейс мастеров маникюра",
];

export function WorkflowClient({
  workflows,
  selected,
  leads = [],
}: {
  workflows: WorkflowSummary[];
  selected: WorkflowDetail | null;
  leads?: WorkflowLeadOption[];
}) {
  const router = useRouter();
  const [idea, setIdea] = useState("");
  const [mode, setMode] = useState<"scratch" | "business">("scratch");
  const [leadId, setLeadId] = useState("");
  const [pending, startTransition] = useTransition();

  function createEmpty() {
    if (pending) return;
    startTransition(async () => {
      const res = await createEmptyWorkflow();
      if (!res.ok || !res.id) {
        toast.error("Не удалось создать воркфлоу");
        return;
      }
      toast.success("Пустой воркфлоу создан — добавляйте блоки");
      router.push(`/workflow?id=${res.id}`);
    });
  }

  function generate(text: string) {
    const value = text.trim();
    const usingBusiness = mode === "business" && leadId;
    if ((!value && !usingBusiness) || pending) return;
    startTransition(async () => {
      const res = await generateWorkflow({
        idea: value,
        leadId: usingBusiness ? leadId : undefined,
      });
      if (!res.ok || !res.id) {
        toast.error(res.error ?? "Не удалось сгенерировать");
        return;
      }
      toast.success(
        res.ai
          ? "Проект Аполлон построил архитектуру"
          : "Собрал архитектуру по шаблону (модель недоступна)",
      );
      setIdea("");
      router.push(`/workflow?id=${res.id}`);
    });
  }

  if (selected) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/workflow")}
            >
              <ArrowLeft className="size-3.5" />
              Все схемы
            </Button>
            <div>
              <h1 className="font-mono text-sm font-semibold">{selected.name}</h1>
              {selected.description ? (
                <p className="text-[11px] text-muted-foreground">
                  {selected.description}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ImportDialog currentId={selected.id} />
            <ExportDialog workflowId={selected.id} />
          </div>
        </div>
        <WorkflowCanvas workflow={selected} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="rounded-md border border-border bg-card p-4">
        <div className="mb-2 flex items-center gap-2">
          <ApolloCore className="size-5" />
          <div>
            <p className="font-mono text-sm font-semibold">Опишите идею</p>
            <p className="text-[11px] text-muted-foreground">
              Проект Аполлон спроектирует продукт по вашему рабочему стандарту
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={createEmpty}
              disabled={pending}
            >
              <FilePlus2 className="size-3.5" />
              Пустой воркфлоу
            </Button>
            <ImportDialog />
          </div>
        </div>
        <p className="mb-2 text-[11px] text-muted-foreground">
          «Пустой воркфлоу» — соберите архитектуру сами с нуля, а ИИ потом
          дополнит изнутри по запросу.
        </p>

        <div className="mb-2 flex flex-wrap items-center gap-2">
          <div className="inline-flex overflow-hidden rounded-md border border-border">
            <button
              type="button"
              onClick={() => setMode("scratch")}
              className={`px-2.5 py-1 font-mono text-[10px] ${mode === "scratch" ? "bg-foreground text-background" : "text-muted-foreground hover:bg-accent"}`}
            >
              С нуля
            </button>
            <button
              type="button"
              onClick={() => setMode("business")}
              className={`px-2.5 py-1 font-mono text-[10px] ${mode === "business" ? "bg-foreground text-background" : "text-muted-foreground hover:bg-accent"}`}
            >
              Из бизнеса
            </button>
          </div>
          {mode === "business" ? (
            leads.length ? (
              <select
                value={leadId}
                onChange={(e) => setLeadId(e.target.value)}
                className="h-7 max-w-xs rounded-md border border-border bg-background px-2 font-mono text-[10px]"
              >
                <option value="">Выберите бизнес…</option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
            ) : (
              <span className="font-mono text-[10px] text-muted-foreground">
                Нет сохранённых лидов — сохраните бизнес в «Поиск лидов».
              </span>
            )
          ) : null}
        </div>
        <Textarea
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) generate(idea);
          }}
          placeholder={
            mode === "business"
              ? "Необязательно: что именно сделать для этого бизнеса. Пусто — Аполлон предложит сам."
              : "Напр.: CRM для стоматологии с онлайн-записью и напоминаниями"
          }
          className="min-h-20 font-mono text-xs"
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button
            onClick={() => generate(idea)}
            disabled={pending || (mode === "business" ? !leadId : !idea.trim())}
          >
            <Sparkles className="size-3.5" />
            {pending ? "Проектирую…" : "Построить архитектуру"}
          </Button>
          {IDEAS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => generate(s)}
              disabled={pending}
              className="rounded-md border border-border px-2 py-1 font-mono text-[10px] text-muted-foreground hover:bg-accent disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {workflows.length === 0 ? (
        <EmptyState
          icon={WorkflowIcon}
          title="Пока нет схем"
          description="Опишите идею выше — Проект Аполлон построит первую архитектуру."
        />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {workflows.map((w) => (
            <div
              key={w.id}
              className="group flex items-start justify-between rounded-md border border-border bg-card p-3 transition-colors hover:border-foreground/30"
            >
              <button
                type="button"
                onClick={() => router.push(`/workflow?id=${w.id}`)}
                className="flex-1 text-left"
              >
                <p className="font-mono text-xs font-semibold">{w.name}</p>
                {w.description ? (
                  <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
                    {w.description}
                  </p>
                ) : null}
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {w.nodeCount} блок(ов)
                </p>
              </button>
              <button
                type="button"
                aria-label="Удалить схему"
                onClick={async () => {
                  const res = await deleteWorkflow(w.id);
                  if (res.ok) {
                    toast.success("Схема удалена");
                    router.refresh();
                  } else toast.error("Не удалось удалить");
                }}
                className="ml-2 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-red-500 group-hover:opacity-100"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
