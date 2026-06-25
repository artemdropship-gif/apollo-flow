"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Link as LinkIcon,
  Loader2,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
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
import { VAULT_CATEGORIES } from "@/lib/constants";
import type { ProjectOption } from "@/features/projects/actions";
import {
  createVaultItem,
  deleteVaultItem,
  revealSecret,
  updateVaultItem,
  type VaultItemInput,
  type VaultItemView,
} from "@/features/vault/actions";

function emptyForm(): VaultItemInput {
  return {
    type: "SECRET",
    category: "",
    label: "",
    secret: "",
    url: "",
    note: "",
    projectId: "",
  };
}

export function VaultClient({
  items,
  projects,
}: {
  items: VaultItemView[];
  projects: ProjectOption[];
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) =>
      [i.label, i.category, i.note, i.url]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q)),
    );
  }, [items, query]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по доступам и ссылкам…"
            className="pl-8"
          />
        </div>
        <VaultItemDialog
          projects={projects}
          trigger={
            <Button>
              <Plus className="size-4" />
              Добавить запись
            </Button>
          }
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={KeyRound}
          title={
            items.length === 0
              ? "Пока нет записей"
              : "Ничего не найдено"
          }
          description={
            items.length === 0
              ? "Добавьте доступы (GitHub, Vercel, домены, API-ключи) с AES-шифрованием или полезные ссылки и промты — вручную, точечно."
              : "Попробуйте изменить запрос."
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <VaultCard key={item.id} item={item} projects={projects} />
          ))}
        </div>
      )}
    </div>
  );
}

function VaultCard({
  item,
  projects,
}: {
  item: VaultItemView;
  projects: ProjectOption[];
}) {
  const [revealed, setRevealed] = useState<string | null>(null);
  const [loading, startLoading] = useTransition();
  const [pending, startTransition] = useTransition();

  function toggleReveal() {
    if (revealed !== null) {
      setRevealed(null);
      return;
    }
    startLoading(async () => {
      const res = await revealSecret(item.id);
      if (!res.ok || res.value === undefined) {
        toast.error(res.error ?? "Не удалось показать");
        return;
      }
      setRevealed(res.value);
    });
  }

  async function copySecret() {
    const res = await revealSecret(item.id);
    if (!res.ok || res.value === undefined) {
      toast.error(res.error ?? "Не удалось скопировать");
      return;
    }
    await navigator.clipboard.writeText(res.value);
    toast.success("Скопировано в буфер");
  }

  function remove() {
    if (!confirm(`Удалить «${item.label}»?`)) return;
    startTransition(async () => {
      await deleteVaultItem(item.id);
      toast.success("Удалено");
    });
  }

  const projectName = projects.find((p) => p.id === item.projectId)?.name;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {item.type === "SECRET" ? (
            <KeyRound className="size-4 text-amber-500" />
          ) : (
            <LinkIcon className="size-4 text-sky-500" />
          )}
          <span className="text-sm font-medium">{item.label}</span>
        </div>
        <div className="flex items-center gap-1">
          <VaultItemDialog
            item={item}
            projects={projects}
            trigger={
              <Button variant="ghost" size="icon" className="size-7">
                <Pencil className="size-3.5" />
              </Button>
            }
          />
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-destructive"
            onClick={remove}
            disabled={pending}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {item.category && (
          <Badge variant="secondary" className="text-[10px]">
            {item.category}
          </Badge>
        )}
        {projectName && (
          <Badge variant="outline" className="text-[10px]">
            {projectName}
          </Badge>
        )}
      </div>

      {item.type === "SECRET" && item.hasSecret && (
        <div className="flex items-center gap-1 rounded-md bg-muted/50 px-2 py-1">
          <code className="flex-1 truncate font-mono text-xs">
            {loading ? "…" : revealed !== null ? revealed : "••••••••••"}
          </code>
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            onClick={toggleReveal}
          >
            {revealed !== null ? (
              <EyeOff className="size-3" />
            ) : (
              <Eye className="size-3" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            onClick={copySecret}
          >
            <Copy className="size-3" />
          </Button>
        </div>
      )}

      {item.url && (
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          className="truncate text-xs text-primary hover:underline"
        >
          {item.url}
        </a>
      )}

      {item.note && (
        <p className="whitespace-pre-wrap text-xs text-muted-foreground">
          {item.note}
        </p>
      )}
    </div>
  );
}

function VaultItemDialog({
  item,
  projects,
  trigger,
}: {
  item?: VaultItemView;
  projects: ProjectOption[];
  trigger: React.ReactElement;
}) {
  const isEdit = Boolean(item);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<VaultItemInput>(
    item
      ? {
          type: item.type,
          category: item.category ?? "",
          label: item.label,
          secret: "",
          url: item.url ?? "",
          note: item.note ?? "",
          projectId: item.projectId ?? "",
        }
      : emptyForm(),
  );
  const [pending, startTransition] = useTransition();

  function set<K extends keyof VaultItemInput>(key: K, value: VaultItemInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit() {
    if (!form.label.trim()) {
      toast.error("Укажите название");
      return;
    }
    startTransition(async () => {
      const res = isEdit
        ? await updateVaultItem(item!.id, form)
        : await createVaultItem(form);
      if (!res.ok) {
        toast.error(res.error ?? "Не удалось сохранить");
        return;
      }
      toast.success(isEdit ? "Запись обновлена" : "Запись добавлена");
      setOpen(false);
      if (!isEdit) setForm(emptyForm());
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Редактировать запись" : "Новая запись"}
          </DialogTitle>
          <DialogDescription>
            Секреты шифруются (AES-256-GCM) и не покидают вашу базу в открытом
            виде.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={form.type === "SECRET" ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => set("type", "SECRET")}
            >
              <KeyRound className="size-3.5" />
              Доступ / секрет
            </Button>
            <Button
              type="button"
              variant={form.type === "LINK" ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => set("type", "LINK")}
            >
              <LinkIcon className="size-3.5" />
              Ссылка
            </Button>
          </div>

          <Field label="Название *">
            <Input
              value={form.label}
              onChange={(e) => set("label", e.target.value)}
              placeholder={
                form.type === "SECRET" ? "GitHub токен" : "Прод-сайт"
              }
            />
          </Field>

          <Field label="Категория">
            <select
              value={form.category ?? ""}
              onChange={(e) => set("category", e.target.value)}
              className="h-9 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            >
              <option value="">— Не выбрано —</option>
              {VAULT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>

          {form.type === "SECRET" ? (
            <Field
              label={
                isEdit && item?.hasSecret
                  ? "Новый секрет (пусто — оставить старый)"
                  : "Секрет"
              }
            >
              <Textarea
                value={form.secret ?? ""}
                onChange={(e) => set("secret", e.target.value)}
                placeholder="ghp_…"
                rows={2}
                className="resize-none font-mono text-xs"
              />
            </Field>
          ) : (
            <Field label="URL">
              <Input
                value={form.url ?? ""}
                onChange={(e) => set("url", e.target.value)}
                placeholder="https://…"
              />
            </Field>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">Проект</Label>
            <select
              value={form.projectId ?? ""}
              onChange={(e) => set("projectId", e.target.value)}
              className="h-9 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            >
              <option value="">— Без проекта —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <Field label="Заметка">
            <Textarea
              value={form.note ?? ""}
              onChange={(e) => set("note", e.target.value)}
              rows={2}
              className="resize-none"
            />
          </Field>
        </div>

        <DialogFooter>
          <Button onClick={submit} disabled={pending}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            {isEdit ? "Сохранить" : "Добавить"}
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
