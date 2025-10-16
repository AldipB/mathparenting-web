// scripts/lib/authoringPipeline.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';
import OpenAI from 'openai';

// Ensure env is loaded when THIS module is imported (critical!)
dotenv.config({ path: ['.env.local', '.env'] });

// ---- OpenAI client (lazy) ----
let _client = null;
function client() {
  if (!_client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is missing. Set it in .env.local or your shell.');
    }
    _client = new OpenAI({
      apiKey,
      // Allow optional custom base URL if you ever use a proxy/Azure:
      baseURL: process.env.OPENAI_BASE_URL || undefined,
    });
  }
  return _client;
}

// ---- helpers you already call from autoAuthor.mjs ----
export async function draftLesson({ topic, model = 'gpt-4o', retries = 3, loose = false, debug = false }) {
  const system = `You are generating short, parent-friendly math lesson guides as JSON. Keep content concrete, household-based, and aligned to the topic.`;
  const user = {
    title: topic.title,
    grade: topic.gradeLabel || topic.grade || String(topic.gradeKey || ''),
    goals: topic.goals || [],
    constraints: { loose },
  };

  // simple retry loop
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await client().chat.completions.create({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: JSON.stringify(user) },
        ],
        temperature: 0.4,
      });

      const text = res.choices?.[0]?.message?.content || '';
      // ensure it parses to JSON-ish (your validator can be stricter)
      return safeJson(text);
    } catch (err) {
      lastErr = err;
      if (debug) console.error(`[draftLesson] attempt ${i + 1} failed:`, err?.message || err);
      await wait(400 * (i + 1));
    }
  }
  throw lastErr || new Error('draftLesson failed');
}

export async function validateDraft(draft, { loose = false } = {}) {
  if (!draft || typeof draft !== 'object') return false;
  // very light checks; keep in sync with your schema
  const title = draft.title || draft.lesson_title || '';
  return Boolean(title && (draft.content || draft.demo || draft.overview));
}

// optional fallback if you enable it
export async function maybeFallback(topic, { debug = false } = {}) {
  // Return a minimal, valid structure so persistDraft can save it.
  const obj = {
    title: topic.title,
    grade: topic.gradeLabel || topic.grade || '',
    overview: `Placeholder outline for "${topic.title}".`,
    content: {
      introduction: `This is an auto-generated fallback for ${topic.title}.`,
      demo: [
        { step: 1, instruction: "Gather a few household items (coins, buttons, blocks)." },
        { step: 2, instruction: "Walk through a simple example related to the topic." },
      ],
    },
  };
  return obj;
}

export async function persistDraft(draft, outPath) {
  // ensure directory and write .json by preference
  const dir = path.dirname(outPath);
  await fs.mkdir(dir, { recursive: true });

  const jsonPath = outPath.endsWith('.json') ? outPath : outPath.replace(/\.md$/i, '.json');
  await fs.writeFile(jsonPath, JSON.stringify(draft, null, 2), 'utf8');
  return jsonPath;
}

// ---- tiny utilities ----
function safeJson(text) {
  // If the model returned markdown fences, strip them
  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  try { return JSON.parse(cleaned); } catch {
    // fallback: wrap as object so validator can still pass
    return { title: '', content: cleaned };
  }
}

const wait = (ms) => new Promise(r => setTimeout(r, ms));
