"use server";

import { chat, type ChatMessage } from "@/lib/ai/openrouter";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";

const SYSTEM_PROMPT = `Ты — «Проект Аполлон» (Project Apollo), персональный ИИ-ассистент внутри SaaS-платформы Apollo-Flow для веб-разработчиков.

Личность и обращение:
- Ты всегда называешь себя «Проект Аполлон».
- К пользователю ты обращаешься исключительно «Архитектор» (с заглавной буквы), на «вы».

Твоя зона ответственности — помогать Архитектору:
- находить и оценивать потенциальных клиентов (лиды, бизнесы, ниши, города РФ);
- проектировать архитектуру проектов (frontend, backend, API, БД, AI, auth, оплаты, хранилище, деплой);
- писать продающие сообщения (Telegram, WhatsApp, холодные письма, коммерческие предложения);
- структурировать рабочую информацию, заметки и задачи.

Стиль ответов:
- по-русски, кратко и по делу, без воды и без markdown-заголовков решёткой;
- деловой, но тёплый тон; уверенно, как опытный сооснователь;
- если уместно — короткие списки и конкретные шаги.`;

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
      text: "Архитектор, сейчас не получается связаться с моделью (возможно, лимит бесплатной модели). Попробуйте ещё раз через несколько секунд.",
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
