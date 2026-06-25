export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

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
  return (
    process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_API_KEY || ""
  );
}

export function aiEnabled(): boolean {
  return Boolean(authToken());
}

interface AnthropicContentBlock {
  type: string;
  text?: string;
}

interface AnthropicResponse {
  content?: AnthropicContentBlock[];
}

/**
 * Send a chat completion request to the Anthropic-compatible gateway
 * (aiprimetech.io by default). System messages are merged into the top-level
 * `system` field; user/assistant turns are passed as `messages`.
 * Returns the assistant text, or null when no key is set or the request fails.
 */
export async function chat(
  messages: ChatMessage[],
  opts?: { temperature?: number; maxTokens?: number },
): Promise<string | null> {
  const token = authToken();
  if (!token) return null;

  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;

  const system = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n")
    .trim();

  const turns = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role, content: m.content }));

  try {
    const res = await fetch(`${baseUrl()}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "anthropic-version": ANTHROPIC_VERSION,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        model,
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
