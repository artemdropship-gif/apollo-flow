"use client";

import { useState, useTransition } from "react";
import type { MessageChannel } from "@prisma/client";
import { Check, Copy, Loader2, MessageSquareText, Sparkles } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { generateLeadMessage } from "@/features/leads/actions";
import { MESSAGE_CHANNELS } from "@/features/leads/types";

export function MessageDialog({
  leadId,
  leadName,
}: {
  leadId: string;
  leadName: string;
}) {
  const [channel, setChannel] = useState<MessageChannel>("TELEGRAM");
  const [drafts, setDrafts] = useState<Partial<Record<MessageChannel, string>>>(
    {},
  );
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  const content = drafts[channel] ?? "";

  function generate(target: MessageChannel) {
    startTransition(async () => {
      try {
        const res = await generateLeadMessage(leadId, target);
        setDrafts((d) => ({ ...d, [target]: res.content }));
      } catch {
        toast.error("Не удалось сгенерировать сообщение");
      }
    });
  }

  function selectChannel(target: MessageChannel) {
    setChannel(target);
    setCopied(false);
    if (!drafts[target]) generate(target);
  }

  async function copy() {
    if (!content) return;
    await navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success("Скопировано");
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <MessageSquareText className="size-4" />
            Сообщение
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Сообщение для «{leadName}»</DialogTitle>
          <DialogDescription>
            AI генерирует персональный текст под выбранный канал.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-1.5">
          {MESSAGE_CHANNELS.map((c) => (
            <Button
              key={c.value}
              size="sm"
              variant={channel === c.value ? "default" : "outline"}
              onClick={() => selectChannel(c.value)}
            >
              {c.label}
            </Button>
          ))}
        </div>

        <Textarea
          value={pending && !content ? "" : content}
          onChange={(e) =>
            setDrafts((d) => ({ ...d, [channel]: e.target.value }))
          }
          placeholder={
            pending
              ? "Генерация…"
              : "Нажмите на канал, чтобы сгенерировать сообщение."
          }
          className={cn("min-h-44 resize-none", pending && "opacity-60")}
        />

        <div className="flex justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => generate(channel)}
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            Перегенерировать
          </Button>
          <Button size="sm" disabled={!content} onClick={copy}>
            {copied ? (
              <Check className="size-4" />
            ) : (
              <Copy className="size-4" />
            )}
            Копировать
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
