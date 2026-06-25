"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { CornerDownLeft, X } from "lucide-react";
import { ApolloCore } from "@/components/layout/apollo-core";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { askApollo, type AssistantTurn } from "@/features/assistant/actions";

export function AssistantBar() {
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<AssistantTurn[]>([]);
  const [pending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight });
  }, [turns, pending]);

  function submit() {
    const prompt = value.trim();
    if (!prompt || pending) return;
    const history = turns;
    setTurns((t) => [...t, { role: "user", content: prompt }]);
    setValue("");
    setOpen(true);
    startTransition(async () => {
      const res = await askApollo(prompt, history);
      setTurns((t) => [...t, { role: "assistant", content: res.text }]);
    });
  }

  const showPanel = open && (turns.length > 0 || pending);

  return (
    <div ref={rootRef} className="relative w-full max-w-xl">
      <div className="relative">
        <ApolloCore className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 opacity-80" />
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder="Спросите Проект Аполлон…"
          className="h-9 pl-9 pr-9 font-mono"
          aria-label="Запрос к ИИ-ассистенту Проект Аполлон"
        />
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 items-center gap-1 font-mono text-[10px] text-muted-foreground sm:flex">
          <CornerDownLeft className="size-3" />
        </kbd>
      </div>

      {showPanel && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-lg border border-border bg-popover shadow-md ring-1 ring-foreground/10">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <div className="flex items-center gap-2">
              <ApolloCore className="size-5" />
              <div className="leading-tight">
                <p className="font-mono text-xs font-semibold">Проект Аполлон</p>
                <p className="text-[10px] text-muted-foreground">
                  Ассистент Архитектора
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Закрыть"
            >
              <X className="size-3.5" />
            </button>
          </div>

          <ScrollArea className="max-h-80">
            <div ref={threadRef} className="flex max-h-80 flex-col gap-3 p-3">
              {turns.map((turn, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex",
                    turn.role === "user" ? "justify-end" : "justify-start",
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-xs leading-relaxed",
                      turn.role === "user"
                        ? "bg-foreground text-background"
                        : "border border-border bg-card text-card-foreground",
                    )}
                  >
                    {turn.content}
                  </div>
                </div>
              ))}
              {pending && (
                <div className="flex justify-start">
                  <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
                    Проект Аполлон думает…
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
