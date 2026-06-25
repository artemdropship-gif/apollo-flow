"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { exportWorkflow, importArchitecture } from "@/features/workflow/actions";

function download(name: string, ext: string, content: string) {
  const safe = name.replace(/[^\p{L}\p{N}_-]+/gu, "-").slice(0, 40) || "schema";
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safe}.${ext}`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportDialog({ workflowId }: { workflowId: string }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"json" | "md">("md");
  const [data, setData] = useState<{ name: string; json: string; markdown: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  function load(next: boolean) {
    setOpen(next);
    if (next && !data) {
      startTransition(async () => {
        const res = await exportWorkflow(workflowId);
        if (res.ok && res.json && res.markdown) {
          setData({ name: res.name ?? "schema", json: res.json, markdown: res.markdown });
        } else {
          toast.error("Не удалось выгрузить схему");
          setOpen(false);
        }
      });
    }
  }

  const text = data ? (tab === "json" ? data.json : data.markdown) : "";

  return (
    <Dialog open={open} onOpenChange={load}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <Download className="size-3.5" />
            Выгрузить
          </Button>
        }
      />
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm">Выгрузить схему</DialogTitle>
          <DialogDescription className="text-[11px]">
            JSON — чтобы загрузить обратно. Текст для Claude — вставить в Claude, он дополнит и вернёт JSON.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-1">
          {(["md", "json"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-md border px-2 py-1 font-mono text-[10px] ${
                tab === t ? "border-foreground/40 bg-accent" : "border-border text-muted-foreground"
              }`}
            >
              {t === "md" ? "Текст для Claude" : "JSON"}
            </button>
          ))}
        </div>

        <Textarea
          readOnly
          value={pending ? "Готовлю…" : text}
          className="h-64 max-h-64 resize-none overflow-auto font-mono text-[11px] [field-sizing:fixed]"
        />

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!text}
            onClick={async () => {
              await navigator.clipboard.writeText(text);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            Копировать
          </Button>
          <Button
            size="sm"
            disabled={!text || !data}
            onClick={() => data && download(data.name, tab === "json" ? "json" : "md", text)}
          >
            <Download className="size-3.5" />
            Скачать .{tab === "json" ? "json" : "md"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ImportDialog({ currentId }: { currentId?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [merge, setMerge] = useState(false);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function submit() {
    const value = text.trim();
    if (!value || pending) return;
    startTransition(async () => {
      const res = await importArchitecture({
        text: value,
        mergeInto: merge && currentId ? currentId : undefined,
      });
      if (!res.ok || !res.id) {
        toast.error(res.error ?? "Не удалось загрузить");
        return;
      }
      toast.success(res.ai ? "Загрузил и распознал через ИИ" : "Схема загружена");
      setText("");
      setOpen(false);
      router.push(`/workflow?id=${res.id}`);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <Upload className="size-3.5" />
            Загрузить
          </Button>
        }
      />
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm">Загрузить схему</DialogTitle>
          <DialogDescription className="text-[11px]">
            Вставьте JSON (из выгрузки) или текст/ответ Claude — соберу схему. Можно загрузить файл .json / .md.
          </DialogDescription>
        </DialogHeader>

        <input
          ref={fileRef}
          type="file"
          accept=".json,.md,.txt,application/json,text/markdown,text/plain"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) setText(await file.text());
            if (fileRef.current) fileRef.current.value = "";
          }}
        />

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Вставьте JSON или текст из Claude…"
          className="h-56 max-h-56 resize-none overflow-auto font-mono text-[11px] [field-sizing:fixed]"
        />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              <Upload className="size-3.5" />
              Из файла
            </Button>
            {currentId ? (
              <label className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
                <input
                  type="checkbox"
                  checked={merge}
                  onChange={(e) => setMerge(e.target.checked)}
                  className="size-3.5 accent-foreground"
                />
                Влить в текущую схему
              </label>
            ) : null}
          </div>
          <Button size="sm" onClick={submit} disabled={pending || !text.trim()}>
            {pending ? "Загружаю…" : "Загрузить"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
