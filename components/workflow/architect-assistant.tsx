"use client";

import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Sparkles, SendHorizontal, Loader2, User, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "Спроектируй SaaS для онлайн-записи клиентов в барбершоп",
  "Какой стек выбрать для маркетплейса услуг с оплатой и чатом?",
  "Предложи архитектуру Telegram-бота с админкой и аналитикой",
];

const markdownComponents = {
  p: (props: React.ComponentProps<"p">) => (
    <p className="mb-2 last:mb-0" {...props} />
  ),
  ul: (props: React.ComponentProps<"ul">) => (
    <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0" {...props} />
  ),
  ol: (props: React.ComponentProps<"ol">) => (
    <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0" {...props} />
  ),
  h3: (props: React.ComponentProps<"h3">) => (
    <h3 className="mt-3 mb-1 font-semibold first:mt-0" {...props} />
  ),
  h2: (props: React.ComponentProps<"h2">) => (
    <h2 className="mt-3 mb-1 font-semibold first:mt-0" {...props} />
  ),
  strong: (props: React.ComponentProps<"strong">) => (
    <strong className="font-semibold" {...props} />
  ),
  code: (props: React.ComponentProps<"code">) => (
    <code
      className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]"
      {...props}
    />
  ),
  a: (props: React.ComponentProps<"a">) => (
    <a
      className="text-primary underline underline-offset-4"
      target="_blank"
      rel="noreferrer"
      {...props}
    />
  ),
};

export function ArchitectAssistant() {
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  function scrollToBottom() {
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setError(null);
    const next: ChatTurn[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setLoading(true);
    scrollToBottom();

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });

      if (!res.ok) {
        throw new Error(
          res.status === 401
            ? "Нужно войти в систему."
            : "Ассистент временно недоступен. Попробуйте ещё раз.",
        );
      }

      const data = (await res.json()) as {
        reply: string | null;
        enabled: boolean;
      };

      if (data.reply) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.reply as string },
        ]);
      } else if (!data.enabled) {
        setError(
          "AI-ключ не настроен. Задайте ANTHROPIC_AUTH_TOKEN в .env, чтобы ассистент отвечал вживую.",
        );
      } else {
        setError("Модель не вернула ответ. Попробуйте переформулировать запрос.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Неизвестная ошибка.");
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="glass flex h-[calc(100vh-13rem)] min-h-[420px] flex-col rounded-xl border border-border/70">
      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
        <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Sparkles className="size-4" />
        </div>
        <div>
          <p className="text-sm font-medium leading-none">AI-ассистент архитектуры</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Опишите идею — предложу архитектуру и стек (Claude)
          </p>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div ref={scrollRef} className="flex flex-col gap-4 p-4">
          {isEmpty && (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Sparkles className="size-6" />
              </div>
              <p className="max-w-sm text-sm text-muted-foreground">
                Опишите продукт или задачу — ассистент предложит архитектуру,
                стек и ключевые решения. Например:
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="rounded-full border border-border/70 bg-background/60 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "flex gap-3",
                m.role === "user" && "flex-row-reverse",
              )}
            >
              <div
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-lg",
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-primary/10 text-primary",
                )}
              >
                {m.role === "user" ? (
                  <User className="size-4" />
                ) : (
                  <Bot className="size-4" />
                )}
              </div>
              <div
                className={cn(
                  "max-w-[80%] rounded-xl px-3.5 py-2.5 text-sm",
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "border border-border/70 bg-background/60",
                )}
              >
                {m.role === "assistant" ? (
                  <div className="leading-relaxed">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={markdownComponents}
                    >
                      {m.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <span className="whitespace-pre-wrap">{m.content}</span>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Bot className="size-4" />
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-background/60 px-3.5 py-2.5 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Думаю…
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {error && (
        <div className="mx-4 mb-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      <form
        className="flex items-end gap-2 border-t border-border/60 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          placeholder="Опишите идею проекта…"
          className="max-h-40 min-h-[44px] flex-1 resize-none"
          disabled={loading}
        />
        <Button
          type="submit"
          size="icon-lg"
          disabled={loading || !input.trim()}
          aria-label="Отправить"
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <SendHorizontal className="size-4" />
          )}
        </Button>
      </form>
    </div>
  );
}
