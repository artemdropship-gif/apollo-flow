"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckSquare,
  FileText,
  FolderKanban,
  KeyRound,
  Loader2,
  Plus,
  Search as SearchIcon,
  Users,
  Workflow as WorkflowIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { PROJECT_STATUSES } from "@/lib/constants";
import {
  createProject,
  type ProjectSummary,
} from "@/features/projects/actions";

function statusMeta(value: string) {
  return PROJECT_STATUSES.find((s) => s.value === value) ?? PROJECT_STATUSES[0];
}

export function ProjectsClient({ projects }: { projects: ProjectSummary[] }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <CreateProjectDialog />
      </div>

      {projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="Пока нет проектов"
          description="Создайте новый проект и соберите его как конструктор: привяжите лида, воркфлоу, доступы, заметки и задачи."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => {
            const meta = statusMeta(p.status);
            return (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-semibold">{p.name}</span>
                  <Badge
                    variant="outline"
                    className="shrink-0 text-[10px]"
                    style={{ borderColor: meta.color, color: meta.color }}
                  >
                    {meta.label}
                  </Badge>
                </div>
                {p.client && (
                  <span className="-mt-1 text-xs text-muted-foreground">
                    {p.client}
                  </span>
                )}
                {p.description && (
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {p.description}
                  </p>
                )}
                <div className="mt-auto flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                  <Stat icon={Users} value={p.counts.leads} />
                  <Stat icon={WorkflowIcon} value={p.counts.workflows} />
                  <Stat icon={KeyRound} value={p.counts.vaultItems} />
                  <Stat icon={FileText} value={p.counts.notes} />
                  <Stat
                    icon={CheckSquare}
                    value={`${p.counts.tasksDone}/${p.counts.tasks}`}
                  />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({
  icon: Icon,
  value,
}: {
  icon: typeof Users;
  value: number | string;
}) {
  return (
    <span className="inline-flex items-center gap-1">
      <Icon className="size-3" />
      {value}
    </span>
  );
}

function CreateProjectDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [description, setDescription] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!name.trim()) {
      toast.error("Укажите название");
      return;
    }
    startTransition(async () => {
      try {
        const res = await createProject({ name, client, description });
        toast.success("Проект создан");
        setOpen(false);
        router.push(`/projects/${res.id}`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Не удалось создать");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Plus className="size-4" />
            Новый проект
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Новый проект</DialogTitle>
          <DialogDescription>
            Создайте пустой проект — наполните его составными частями внутри.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Название *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Сайт для барбершопа «Бородач»"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Клиент</Label>
            <Input
              value={client}
              onChange={(e) => setClient(e.target.value)}
              placeholder="ИП Иванов"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Краткое описание</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={pending}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <SearchIcon className="size-4" />
            )}
            Создать
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
