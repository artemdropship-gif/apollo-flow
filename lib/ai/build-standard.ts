import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The Архитектор's working standard lives verbatim in docs/BUILD_PROMPT.md so it
 * travels with the repo (memory in repo — survives new sessions/accounts).
 * We read it at runtime and feed it to the AI as the canonical engine, instead
 * of paraphrasing it in code.
 */
let cached: string | null = null;

export function buildStandard(): string {
  if (cached !== null) return cached;
  try {
    cached = readFileSync(join(process.cwd(), "docs", "BUILD_PROMPT.md"), "utf8").trim();
  } catch {
    cached = "";
  }
  return cached;
}
