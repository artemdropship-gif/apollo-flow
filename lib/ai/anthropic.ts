export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// Anthropic-compatible gateway (same setup as the OpenClaw configuration):
// base URL + Bearer token. Defaults target the project's aiprimetech.io gateway.
const DEFAULT_BASE_URL = "https://aiprimetech.io";
const DEFAULT_MODEL = "claude-sonnet-4-6";
const ANTHROPIC_VERSION = "2023-06-01";

function baseUrl(): string {
  return (process.env.ANTHROPIC_BASE_URL || DEFAULT_BASE_URL).replace(
    /\/+$/,
    "",
  );
}

function authToken(): string {
  return process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_API_KEY || "";
}

function model(): string {
  return process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
}

export function aiEnabled(): boolean {
  return Boolean(authToken());
}

function headers(token: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "anthropic-version": ANTHROPIC_VERSION,
    Authorization: `Bearer ${token}`,
  };
}

/** Split our flat message list into Anthropic's `system` + `messages` shape. */
function toAnthropicPayload(messages: ChatMessage[]) {
  const system = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n")
    .trim();

  const turns = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  return { system, turns };
}

interface AnthropicContentBlock {
  type: string;
  text?: string;
}

interface AnthropicResponse {
  content?: AnthropicContentBlock[];
}

export async function chat(
  messages: ChatMessage[],
  opts?: { temperature?: number; maxTokens?: number },
): Promise<string | null> {
  const token = authToken();
  if (!token) return null;

  const { system, turns } = toAnthropicPayload(messages);

  try {
    const res = await fetch(`${baseUrl()}/v1/messages`, {
      method: "POST",
      headers: headers(token),
      body: JSON.stringify({
        model: model(),
        max_tokens: opts?.maxTokens ?? 1024,
        temperature: opts?.temperature ?? 0.7,
        ...(system ? { system } : {}),
        messages: turns,
      }),
    });

    if (!res.ok) return null;

    const data = (await res.json()) as AnthropicResponse;
    const text = (data.content ?? [])
      .filter((b) => b.type === "text" && typeof b.text === "string")
      .map((b) => b.text as string)
      .join("")
      .trim();

    return text || null;
  } catch {
    return null;
  }
}

interface StreamEvent {
  type?: string;
  delta?: { type?: string; text?: string };
}

/**
 * Stream a completion token-by-token. Yields text deltas as they arrive,
 * parsing Anthropic's SSE format (`content_block_delta` → `text_delta`).
 */
export async function* chatStream(
  messages: ChatMessage[],
  opts?: { temperature?: number; maxTokens?: number },
): AsyncGenerator<string> {
  const token = authToken();
  if (!token) return;

  const { system, turns } = toAnthropicPayload(messages);

  let res: Response;
  try {
    res = await fetch(`${baseUrl()}/v1/messages`, {
      method: "POST",
      headers: headers(token),
      body: JSON.stringify({
        model: model(),
        max_tokens: opts?.maxTokens ?? 1024,
        temperature: opts?.temperature ?? 0.7,
        ...(system ? { system } : {}),
        messages: turns,
        stream: true,
      }),
    });
  } catch {
    return;
  }
  if (!res.ok || !res.body) return;

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
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
      if (!payload || payload === "[DONE]") continue;
      try {
        const event = JSON.parse(payload) as StreamEvent;
        if (event.type === "message_stop") return;
        if (
          event.type === "content_block_delta" &&
          event.delta?.type === "text_delta" &&
          event.delta.text
        ) {
          yield event.delta.text;
        }
      } catch {
        // partial JSON across chunks — next read completes it
      }
    }
  }
}
