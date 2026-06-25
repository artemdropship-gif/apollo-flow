"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Eye,
  FileText,
  Loader2,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Markdown } from "@/components/shared/markdown";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";
import type { ProjectOption } from "@/features/projects/actions";
import {
  createNote,
  deleteNote,
  updateNote,
  type NoteView,
} from "@/features/notes/actions";

type SaveState = "idle" | "saving" | "saved";

export function NotesClient({
  initialNotes,
  projects,
}: {
  initialNotes: NoteView[];
  projects: ProjectOption[];
}) {
  const [notes, setNotes] = useState<NoteView[]>(initialNotes);
  const [activeId, setActiveId] = useState<string | null>(
    initialNotes[0]?.id ?? null,
  );
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);

  const active = notes.find((n) => n.id === activeId) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter((n) =>
      [n.title, n.content, ...n.tags]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(q)),
    );
  }, [notes, query]);

  function patchLocal(id: string, patch: Partial<NoteView>) {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, ...patch } : n)),
    );
  }

  async function onCreate() {
    setCreating(true);
    const res = await createNote();
    setCreating(false);
    if (res.ok && res.note) {
      setNotes((prev) => [res.note!, ...prev]);
      setActiveId(res.note.id);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Удалить заметку?")) return;
    await deleteNote(id);
    setNotes((prev) => {
      const next = prev.filter((n) => n.id !== id);
      if (activeId === id) setActiveId(next[0]?.id ?? null);
      return next;
    });
    toast.success("Заметка удалена");
  }

  async function onPin(note: NoteView) {
    const pinned = !note.pinned;
    patchLocal(note.id, { pinned });
    await updateNote(note.id, { pinned });
  }

  return (
    <div className="grid h-[calc(100vh-13rem)] grid-cols-1 gap-3 md:grid-cols-[300px_1fr]">
      <div className="flex min-h-0 flex-col gap-2 rounded-xl border border-border bg-card p-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск…"
              className="h-9 pl-8"
            />
          </div>
          <Button size="icon" className="size-9" onClick={onCreate} disabled={creating}>
            {creating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
          </Button>
        </div>

        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">
              {notes.length === 0 ? "Создайте первую заметку" : "Ничего не найдено"}
            </p>
          ) : (
            filtered.map((n) => (
              <button
                key={n.id}
                onClick={() => setActiveId(n.id)}
                className={cn(
                  "flex w-full flex-col gap-0.5 rounded-lg px-2 py-1.5 text-left transition-colors",
                  n.id === activeId
                    ? "bg-accent"
                    : "hover:bg-accent/50",
                )}
              >
                <div className="flex items-center gap-1.5">
                  {n.pinned && <Pin className="size-3 shrink-0 text-amber-500" />}
                  <span className="truncate text-sm font-medium">{n.title}</span>
                </div>
                <span className="truncate text-[11px] text-muted-foreground">
                  {n.content.replace(/[#*`>\-]/g, "").trim().slice(0, 60) ||
                    "Пусто"}
                </span>
                {n.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {n.tags.slice(0, 3).map((t) => (
                      <Badge key={t} variant="secondary" className="text-[9px]">
                        #{t}
                      </Badge>
                    ))}
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {active ? (
        <NoteEditor
          key={active.id}
          note={active}
          projects={projects}
          onPatch={(patch) => patchLocal(active.id, patch)}
          onDelete={() => onDelete(active.id)}
          onPin={() => onPin(active)}
        />
      ) : (
        <div className="rounded-xl border border-border bg-card">
          <EmptyState
            icon={FileText}
            title="Нет выбранной заметки"
            description="Создайте новую или выберите из списка. Markdown поддерживается, изменения сохраняются автоматически."
          />
        </div>
      )}
    </div>
  );
}

function NoteEditor({
  note,
  projects,
  onPatch,
  onDelete,
  onPin,
}: {
  note: NoteView;
  projects: ProjectOption[];
  onPatch: (patch: Partial<NoteView>) => void;
  onDelete: () => void;
  onPin: () => void;
}) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [tags, setTags] = useState<string[]>(note.tags);
  const [projectId, setProjectId] = useState(note.projectId ?? "");
  const [tagInput, setTagInput] = useState("");
  const [preview, setPreview] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback(
    (patch: Parameters<typeof updateNote>[1]) => {
      setSaveState("saving");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(async () => {
        await updateNote(note.id, patch);
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 1500);
      }, 600);
    },
    [note.id],
  );

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function changeTitle(v: string) {
    setTitle(v);
    onPatch({ title: v || "Без названия" });
    save({ title: v });
  }

  function changeContent(v: string) {
    setContent(v);
    onPatch({ content: v });
    save({ content: v });
  }

  function addTag() {
    const t = tagInput.trim().replace(/^#/, "").toLowerCase();
    if (!t || tags.includes(t)) {
      setTagInput("");
      return;
    }
    const next = [...tags, t];
    setTags(next);
    setTagInput("");
    onPatch({ tags: next });
    save({ tags: next });
  }

  function removeTag(t: string) {
    const next = tags.filter((x) => x !== t);
    setTags(next);
    onPatch({ tags: next });
    save({ tags: next });
  }

  function changeProject(v: string) {
    setProjectId(v);
    onPatch({ projectId: v || null });
    save({ projectId: v || null });
  }

  return (
    <div className="flex min-h-0 flex-col gap-2 rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-2">
        <Input
          value={title}
          onChange={(e) => changeTitle(e.target.value)}
          placeholder="Заголовок"
          className="border-0 px-0 text-base font-semibold shadow-none focus-visible:ring-0"
        />
        <span className="flex w-20 shrink-0 items-center justify-end gap-1 text-[11px] text-muted-foreground">
          {saveState === "saving" && (
            <>
              <Loader2 className="size-3 animate-spin" /> Сохр…
            </>
          )}
          {saveState === "saved" && (
            <>
              <Check className="size-3 text-green-500" /> Сохранено
            </>
          )}
        </span>
        <Button variant="ghost" size="icon" className="size-8" onClick={onPin}>
          {note.pinned ? (
            <PinOff className="size-4" />
          ) : (
            <Pin className="size-4" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => setPreview((p) => !p)}
        >
          {preview ? <Pencil className="size-4" /> : <Eye className="size-4" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={projectId}
          onChange={(e) => changeProject(e.target.value)}
          className="h-7 rounded-md border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring dark:bg-input/30"
        >
          <option value="">— Без проекта —</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        {tags.map((t) => (
          <Badge key={t} variant="secondary" className="gap-1 text-[10px]">
            #{t}
            <button onClick={() => removeTag(t)}>
              <X className="size-2.5" />
            </button>
          </Badge>
        ))}
        <Input
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag();
            }
          }}
          placeholder="+ тег"
          className="h-7 w-24 text-xs"
        />
      </div>

      {preview ? (
        <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-border/60 bg-background/40 p-3">
          {content.trim() ? (
            <Markdown>{content}</Markdown>
          ) : (
            <p className="text-xs text-muted-foreground">Пусто</p>
          )}
        </div>
      ) : (
        <textarea
          value={content}
          onChange={(e) => changeContent(e.target.value)}
          placeholder="Пишите в Markdown… Заголовки (#), списки (-), ссылки, таблицы поддерживаются."
          className="min-h-0 flex-1 resize-none rounded-lg border border-border/60 bg-background/40 p-3 font-mono text-sm outline-none focus-visible:border-ring"
        />
      )}
    </div>
  );
}
