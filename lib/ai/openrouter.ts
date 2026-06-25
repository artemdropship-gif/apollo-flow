export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

const DEFAULT_MODEL = "openai/gpt-oss-120b:free";

// Strong, free models on OpenRouter. The chain is tried in order: if a model
// is rate-limited / errors / is unavailable, the next one is used automatically.
// Ordered for both strength and provider diversity so one provider's limit
// doesn't take the assistant down. Verified responding as of 2026-06.
const FALLBACK_MODELS = [
  "openai/gpt-oss-120b:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "qwen/qwen3-next-80b-a3b-instruct:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemma-4-31b-it:free",
  "openai/gpt-oss-20b:free",
];

export function aiEnabled(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

function headers(key: string): Record<string, string> {
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    "X-Title": "Apollo-Flow",
  };
}

/**
 * Stream a chat completion token-by-token. Yields text deltas as they arrive.
 * Falls through the model list until one responds with a streamable body.
 */
export async function* chatStream(
  messages: ChatMessage[],
  opts?: { temperature?: number; maxTokens?: number },
): AsyncGenerator<string> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return;

  const primary = process.env.OPENROUTER_MODEL || DEFAULT_MODEL;
  const models = [primary, ...FALLBACK_MODELS.filter((m) => m !== primary)];

  for (const model of models) {
    let res: Response;
    try {
      res = await fetch(ENDPOINT, {
        method: "POST",
        headers: headers(key),
        body: JSON.stringify({
          model,
          messages,
          temperature: opts?.temperature ?? 0.7,
          max_tokens: opts?.maxTokens ?? 1024,
          stream: true,
        }),
      });
    } catch {
      continue;
    }
    if (!res.ok || !res.body) continue;

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let emitted = false;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === "[DONE]") return;
        try {
          const json = JSON.parse(payload) as {
            choices?: { delta?: { content?: string } }[];
          };
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) {
            emitted = true;
            yield delta;
          }
        } catch {
          // partial JSON across chunks — ignore, next read completes it
        }
      }
    }
    if (emitted) return; // streamed successfully, don't fall through
  }
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
