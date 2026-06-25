import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import { chat, aiEnabled, type ChatMessage } from "@/lib/ai/anthropic";

export const runtime = "nodejs";

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(8000),
      }),
    )
    .min(1)
    .max(40),
});

const SYSTEM_PROMPT = `Ты — AI-ассистент по архитектуре в приложении Apollo-Flow.
Пользователь описывает идею продукта или задачу, а ты помогаешь спроектировать решение.

Отвечай на русском языке, кратко и по делу, без воды. Структурируй ответ в Markdown:
- предложи архитектуру (основные компоненты и как они связаны);
- порекомендуй конкретный технологический стек (frontend, backend, БД, инфраструктура, интеграции);
- отметь ключевые риски или решения, которые стоит принять заранее;
- при необходимости задай 1–2 уточняющих вопроса в конце.

Не выдумывай несуществующие сервисы. Если данных мало — предложи разумные значения по умолчанию.`;

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...parsed.data.messages,
  ];

  const reply = await chat(messages, { temperature: 0.6, maxTokens: 1200 });

  if (!reply) {
    return NextResponse.json({ enabled: aiEnabled(), reply: null });
  }

  return NextResponse.json({ enabled: true, reply });
}
