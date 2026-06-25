import { NextResponse } from "next/server";
import { z } from "zod";
import { chatStream, type ChatMessage } from "@/lib/ai/anthropic";
import { ASSISTANT_SYSTEM_PROMPT } from "@/features/assistant/prompt";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";

export const runtime = "nodejs";

const bodySchema = z.object({
  prompt: z.string().min(1).max(4000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      }),
    )
    .max(20)
    .optional(),
});

export async function POST(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }

  const prompt = parsed.data.prompt.trim();
  const recent = (parsed.data.history ?? [])
    .filter((t) => t.content.trim())
    .slice(-8)
    .map<ChatMessage>((t) => ({ role: t.role, content: t.content }));

  const messages: ChatMessage[] = [
    { role: "system", content: ASSISTANT_SYSTEM_PROMPT },
    ...recent,
    { role: "user", content: prompt },
  ];

  prisma.activity
    .create({
      data: {
        userId: user.id,
        type: "assistant.ask",
        entity: "assistant",
        entityId: user.id,
        meta: { prompt: prompt.slice(0, 200) },
      },
    })
    .catch(() => undefined);

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let any = false;
      try {
        for await (const delta of chatStream(messages, {
          temperature: 0.6,
          maxTokens: 900,
        })) {
          any = true;
          controller.enqueue(encoder.encode(delta));
        }
      } catch {
        // fall through to the fallback message below
      }
      if (!any) {
        controller.enqueue(
          encoder.encode(
            "Архитектор, сейчас не получается связаться с моделью. Попробуйте ещё раз через несколько секунд.",
          ),
        );
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
