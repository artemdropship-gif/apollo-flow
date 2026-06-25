"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ClipboardCopy,
  Copy,
  Download,
  FileText,
  KeyRound,
  Loader2,
  Plus,
  Save,
  Trash2,
  Users,
  Workflow as WorkflowIcon,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PROJECT_STATUSES } from "@/lib/constants";
import type { ProjectStatus } from "@prisma/client";
import {
  addTask,
  deleteProject,
  deleteTask,
  setProjectLink,
  toggleTask,
  updateProject,
  type AttachableItem,
  type ProjectDetail,
} from "@/features/projects/actions";
import {
  buildProjectPrompt,
  importProjectFromText,
  PROJECT_IMPORT_TEMPLATE,
} from "@/features/projects/prompt";

export function ProjectDetailClient({
  project,
}: {
  project: ProjectDetail;
}) {
  const router = useRouter();
  const [name, setName] = useState(project.name);
  const [client, setClient] = useState(project.client ?? "");
  const [status, setStatus] = useState<ProjectStatus>(project.status);
  const [deadline, setDeadline] = useState(
    project.deadline ? project.deadline.slice(0, 10) : "",
  );
  const [description, setDescription] = useState(project.description ?? "");
  const [context, setContext] = useState(project.context ?? "");
  const [saving, startSaving] = useTransition();
  const [deleting, startDeleting] = useTransition();

  function saveMeta() {
    startSaving(async () => {
      const res = await updateProject(project.id, {
        name,
        client,
        status,
        deadline: deadline || null,
        description,
        context,
      });
      if (!res.ok) {
        toast.error(res.error ?? "Не удалось сохранить");
        return;
      }
      toast.success("Сохранено");
      router.refresh();
    });
  }

  function removeProject() {
    if (!confirm(`Удалить проект «${project.name}»? Связи открепятся.`)) return;
    startDeleting(async () => {
      await deleteProject(project.id);
      toast.success("Проект удалён");
      router.push("/projects");
    });
  }

  return (
    <div className="space-y-4 pb-10">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" render={<Link href="/projects" />}>
          <ArrowLeft className="size-4" />
          Проекты
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <CopyPromptButton projectId={project.id} />
          <ImportDialog projectId={project.id} />
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive"
            onClick={removeProject}
            disabled={deleting}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      <section className="space-y-3 rounded-xl border border-border bg-card p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Название">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Клиент">
            <Input
              value={client}
              onChange={(e) => setClient(e.target.value)}
              placeholder="Имя клиента / компания"
            />
          </Field>
          <Field label="Статус">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ProjectStatus)}
              className="h-9 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring dark:bg-input/30"
            >
              {PROJECT_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Дедлайн">
            <Input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </Field>
        </div>
        <Field label="Описание">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="resize-none"
          />
        </Field>
        <Field label="Контекст (договорённости, решения, история)">
          <Textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            rows={3}
            className="resize-none"
          />
        </Field>
        <div className="flex justify-end">
          <Button onClick={saveMeta} disabled={saving}>
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Сохранить
          </Button>
        </div>
      </section>

      <TasksSection projectId={project.id} tasks={project.tasks} />

      <div className="grid gap-4 md:grid-cols-2">
        <AttachSection
          projectId={project.id}
          kind="lead"
          title="Лиды"
          icon={Users}
          items={project.leads}
          createHref="/leads"
        />
        <AttachSection
          projectId={project.id}
          kind="workflow"
          title="Воркфлоу"
          icon={WorkflowIcon}
          items={project.workflows}
          createHref="/workflow"
        />
        <AttachSection
          projectId={project.id}
          kind="vault"
          title="Доступы и ссылки"
          icon={KeyRound}
          items={project.vaultItems}
          createHref="/vault"
        />
        <AttachSection
          projectId={project.id}
          kind="note"
          title="Заметки"
          icon={FileText}
          items={project.notes}
          createHref="/notes"
        />
      </div>
    </div>
  );
}

function TasksSection({
  projectId,
  tasks,
}: {
  projectId: string;
  tasks: ProjectDetail["tasks"];
}) {
  const router = useRouter();
  const [items, setItems] = useState(tasks);
  const [title, setTitle] = useState("");
  const [pending, startTransition] = useTransition();

  function add() {
    const t = title.trim();
    if (!t) return;
    startTransition(async () => {
      const res = await addTask(projectId, t);
      if (res.ok && res.task) {
        setItems((prev) => [...prev, res.task!]);
        setTitle("");
      }
    });
  }

  function toggle(id: string, done: boolean) {
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, done } : x)));
    toggleTask(id, done).then(() => router.refresh());
  }

  function remove(id: string) {
    setItems((prev) => prev.filter((x) => x.id !== id));
    deleteTask(id);
  }

  const done = items.filter((t) => t.done).length;

  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Текущие задачи</h2>
        <span className="text-xs text-muted-foreground">
          {done}/{items.length}
        </span>
      </div>
      <div className="space-y-1.5">
        {items.map((t) => (
          <div key={t.id} className="flex items-center gap-2">
            <Checkbox
              checked={t.done}
              onCheckedChange={(v) => toggle(t.id, Boolean(v))}
            />
            <span
              className={
                t.done
                  ? "flex-1 text-sm text-muted-foreground line-through"
                  : "flex-1 text-sm"
              }
            >
              {t.title}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="size-6 text-muted-foreground"
              onClick={() => remove(t.id)}
            >
              <X className="size-3.5" />
            </Button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Новая задача…"
          className="h-9"
        />
        <Button size="icon" className="size-9" onClick={add} disabled={pending}>
          <Plus className="size-4" />
        </Button>
      </div>
    </section>
  );
}

function AttachSection({
  projectId,
  kind,
  title,
  icon: Icon,
  items,
  createHref,
}: {
  projectId: string;
  kind: "lead" | "workflow" | "vault" | "note";
  title: string;
  icon: typeof Users;
  items: AttachableItem[];
  createHref: string;
}) {
  const router = useRouter();
  const [state, setState] = useState(items);
  const [, startTransition] = useTransition();

  const attached = state.filter((i) => i.attached);
  const available = state.filter((i) => !i.attached);

  function toggle(id: string, attach: boolean) {
    setState((prev) =>
      prev.map((i) => (i.id === id ? { ...i, attached: attach } : i)),
    );
    startTransition(async () => {
      await setProjectLink(kind, id, attach ? projectId : null);
      router.refresh();
    });
  }

  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Icon className="size-4" />
          {title}
          <Badge variant="secondary" className="text-[10px]">
            {attached.length}
          </Badge>
        </h2>
        <Button
          variant="ghost"
          size="sm"
          render={<Link href={createHref} />}
          className="text-xs"
        >
          <Plus className="size-3.5" />
          Создать
        </Button>
      </div>

      {attached.length === 0 ? (
        <p className="text-xs text-muted-foreground">Пока ничего не привязано.</p>
      ) : (
        <div className="space-y-1.5">
          {attached.map((i) => (
            <div
              key={i.id}
              className="flex items-center gap-2 rounded-lg bg-muted/40 px-2 py-1.5"
            >
              <span className="flex-1 truncate text-sm">{i.label}</span>
              {i.meta && (
                <span className="truncate text-[11px] text-muted-foreground">
                  {i.meta}
                </span>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={() => toggle(i.id, false)}
              >
                <X className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {available.length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground">
            Привязать существующее ({available.length})
          </summary>
          <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">
            {available.map((i) => (
              <button
                key={i.id}
                onClick={() => toggle(i.id, true)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left hover:bg-accent/50"
              >
                <Plus className="size-3 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate">{i.label}</span>
              </button>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}

function CopyPromptButton({ projectId }: { projectId: string }) {
  const [pending, startTransition] = useTransition();

  function copy() {
    startTransition(async () => {
      const res = await buildProjectPrompt(projectId);
      if (!res.ok || !res.prompt) {
        toast.error(res.error ?? "Не удалось собрать промт");
        return;
      }
      await navigator.clipboard.writeText(res.prompt);
      toast.success("Рабочий промт проекта скопирован");
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={copy} disabled={pending}>
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <ClipboardCopy className="size-4" />
      )}
      Скопировать промт
    </Button>
  );
}

function ImportDialog({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();

  function copyTemplate() {
    navigator.clipboard.writeText(PROJECT_IMPORT_TEMPLATE);
    toast.success("Шаблон-промт скопирован — отправьте его любому ИИ");
  }

  function run() {
    if (!text.trim()) {
      toast.error("Вставьте ответ ИИ");
      return;
    }
    startTransition(async () => {
      const res = await importProjectFromText(projectId, text);
      if (!res.ok) {
        toast.error(res.error ?? "Не удалось импортировать");
        return;
      }
      toast.success(`Импортировано: ${res.applied?.join(", ")}`);
      setOpen(false);
      setText("");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <Download className="size-4" />
            Загрузить из ИИ
          </Button>
        }
      />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Загрузить проект из любой ИИ-сессии</DialogTitle>
          <DialogDescription>
            1) Скопируйте шаблон-промт и отправьте его любому ИИ (даже стороннему).
            2) Вставьте сюда JSON-ответ — Apollo-Flow наполнит проект.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Button variant="outline" size="sm" onClick={copyTemplate} className="w-full">
            <Copy className="size-3.5" />
            Скопировать шаблон-промт
          </Button>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder='Вставьте ответ ИИ (блок ```json … ```)'
            rows={8}
            className="resize-none font-mono text-xs"
          />
        </div>
        <DialogFooter>
          <Button onClick={run} disabled={pending}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            Импортировать
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
