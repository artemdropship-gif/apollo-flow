export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

const DEFAULT_MODEL = "openai/gpt-oss-120b:free";

const FALLBACK_MODELS = [
  "openai/gpt-oss-120b:free",
  "openai/gpt-oss-20b:free",
  "google/gemma-4-31b-it:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "qwen/qwen3-next-80b-a3b-instruct:free",
];

export function aiEnabled(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

export async function chat(
  messages: ChatMessage[],
  opts?: { temperature?: number; maxTokens?: number },
): Promise<string | null> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return null;

  const primary = process.env.OPENROUTER_MODEL || DEFAULT_MODEL;
  const models = [primary, ...FALLBACK_MODELS.filter((m) => m !== primary)];

  for (const model of models) {
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          "HTTP-Referer":
            process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
          "X-Title": "Apollo-Flow",
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: opts?.temperature ?? 0.7,
          max_tokens: opts?.maxTokens ?? 1024,
        }),
      });
      if (!res.ok) continue;
      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const content = data.choices?.[0]?.message?.content;
      if (content && content.trim()) return content.trim();
    } catch {
      // try next model
    }
  }
  return null;
}
