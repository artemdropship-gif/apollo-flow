"use client";

import { useState, useTransition } from "react";
import type { MessageChannel } from "@prisma/client";
import {
  Check,
  Copy,
  Loader2,
  MessageSquareText,
  Send,
  Sparkles,
} from "lucide-react";
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

const SEND_LABEL: Record<MessageChannel, string> = {
  TELEGRAM: "Открыть в Telegram",
  WHATSAPP: "Открыть в WhatsApp",
  EMAIL: "Открыть в почте",
  PROPOSAL: "Отправить письмом",
};

/** Build a one-click deep link that opens the channel with the text prefilled. */
function buildSendLink(
  channel: MessageChannel,
  content: string,
  lead: { phone?: string | null; email?: string | null; website?: string | null },
): string | null {
  if (!content.trim()) return null;
  const text = encodeURIComponent(content);
  const digits = (lead.phone ?? "").replace(/\D/g, "");

  if (channel === "WHATSAPP") {
    return digits ? `https://wa.me/${digits}?text=${text}` : null;
  }
  if (channel === "TELEGRAM") {
    // Telegram can't DM by phone, so open the share sheet with the text ready.
    return `https://t.me/share/url?url=${encodeURIComponent(
      lead.website ?? "",
    )}&text=${text}`;
  }
  // EMAIL / PROPOSAL → mailto, pulling the subject out of a leading "Тема: …" line.
  if (!lead.email) return null;
  let subject = "Предложение по сайту";
  let body = content;
  const m = content.match(/^\s*Тема:\s*(.+)\n?/i);
  if (m) {
    subject = m[1].trim();
    body = content.slice(m[0].length).replace(/^\s+/, "");
  }
  return `mailto:${lead.email}?subject=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(body)}`;
}

export function MessageDialog({
  leadId,
  leadName,
  phone,
  email,
  website,
}: {
  leadId: string;
  leadName: string;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
}) {
  const [channel, setChannel] = useState<MessageChannel>("TELEGRAM");
  const [drafts, setDrafts] = useState<Partial<Record<MessageChannel, string>>>(
    {},
  );
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  const content = drafts[channel] ?? "";
  const sendLink = buildSendLink(channel, content, { phone, email, website });

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

        <div className="flex flex-wrap items-center justify-between gap-2">
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
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={!content} onClick={copy}>
              {copied ? (
                <Check className="size-4" />
              ) : (
                <Copy className="size-4" />
              )}
              Копировать
            </Button>
            <Button
              size="sm"
              disabled={!sendLink}
              title={
                sendLink
                  ? SEND_LABEL[channel]
                  : channel === "WHATSAPP"
                    ? "Нет телефона лида"
                    : channel === "EMAIL" || channel === "PROPOSAL"
                      ? "Нет email лида"
                      : "Сначала сгенерируйте текст"
              }
              render={
                <a
                  href={sendLink ?? undefined}
                  target="_blank"
                  rel="noreferrer"
                />
              }
            >
              <Send className="size-4" />
              {SEND_LABEL[channel]}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
