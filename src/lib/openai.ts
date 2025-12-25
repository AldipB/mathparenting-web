// Edge-safe OpenAI helper for MathParenting
// -----------------------------------------
// - Singleton client (avoids re-instantiation on hot reloads)
// - Tiny, fast system prompt
// - Helpers for building trimmed chat messages

import OpenAI from "openai";

let _client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error(
      "Missing OPENAI_API_KEY. Add it to .env.local (local) and Vercel Project Settings (all envs)."
    );
  }
  if (_client) return _client;
  _client = new OpenAI({ apiKey: key });
  return _client;
}

export type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

// Keep a compact, parent-first system prompt for speed.
export const SYSTEM_PROMPT =
  "You are MathParenting, a warm, concise tutor for parents. Explain simply and step-by-step, with everyday analogies and KaTeX-friendly math when needed. Keep answers compact unless asked for depth.";

export const FAST_MODEL = "gpt-4o-mini"; // default for chat latency
export const QUALITY_MODEL = "gpt-4o";    // upgrade selectively if needed

/**
 * buildMessages
 * Adds the MathParenting system prompt and trims history to last N messages.
 */
export function buildMessages(
  history: ChatMsg[] = [],
  opts?: { keep?: number }
): ChatMsg[] {
  const keep = Math.max(0, opts?.keep ?? 6); // last 6 msgs total is plenty for speed
  const recent = history.slice(-keep);
  return [{ role: "system", content: SYSTEM_PROMPT }, ...recent];
}
