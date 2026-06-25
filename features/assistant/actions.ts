"use server";

import { chat, type ChatMessage } from "@/lib/ai/anthropic";
import { ASSISTANT_SYSTEM_PROMPT as SYSTEM_PROMPT } from "@/features/assistant/prompt";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";

export interface AssistantTurn {
  role: "user" | "assistant";
  content: string;
}

export async function askApollo(
  prompt: string,
  history: AssistantTurn[] = [],
): Promise<{ ok: boolean; text: string }> {
  const user = await requireUser();

  const clean = prompt.trim();
  if (!clean) {
    return { ok: false, text: "Запрос пуст, Архитектор. Сформулируйте задачу." };
  }

  const recent = history
    .filter((t) => t.content.trim())
    .slice(-8)
    .map<ChatMessage>((t) => ({ role: t.role, content: t.content }));

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...recent,
    { role: "user", content: clean },
  ];

  const reply = await chat(messages, { temperature: 0.6, maxTokens: 900 });

  if (!reply) {
    return {
      ok: false,
      text: "Архитектор, сейчас не получается связаться с моделью. Попробуйте ещё раз через несколько секунд.",
    };
  }

  await prisma.activity
    .create({
      data: {
        userId: user.id,
        type: "assistant.ask",
        entity: "assistant",
        entityId: user.id,
        meta: { prompt: clean.slice(0, 200) },
      },
    })
    .catch(() => undefined);

  return { ok: true, text: reply };
}
