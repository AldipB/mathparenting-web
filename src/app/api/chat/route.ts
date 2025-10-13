// src/app/api/chat/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";

/**
 * MathParenting Chat API (parent-first format + $...$ KaTeX + robust sanitizer)
 * ---------------------------------------------------------------------------
 * Changes in this version:
 * - Parent-first section style with bold titles, no numbering, and no headings for Start / Positive Close.
 * - Use $...$ for inline math and $$...$$ for display math to match remark-math + rehype-katex.
 * - Sanitizer converts legacy forms ( \( ... \ ), ( ... ) ) to $ ... $ and fixes integral spacing and power phrases.
 * - Keeps fuzzy math detection, follow-ups, and idempotency cache.
 */

/* ------------------------------------------------------------------------ */
/* 1) Types                                                                 */
/* ------------------------------------------------------------------------ */

type ChatRole = "user" | "assistant" | "system";
type ChatMessage = { role: ChatRole; content: string };
type ChatRequest = { messages: ChatMessage[]; idempotencyKey?: string };
type CacheEntry = { reply: string; expires: number };

/* ------------------------------------------------------------------------ */
/* 2) Friendly variants                                                     */
/* ------------------------------------------------------------------------ */

const VARIANTS = {
  greeting: [
    "Hi there! It is wonderful to see you. What math topic would you like us to work on together today?",
    "Hello! I am really glad you are here. What math concept would you like me to make simple for you?",
    "Welcome! Let us make math fun and gentle to learn. Which topic should we start with?",
    "Hey! It is always a pleasure helping parents. Tell me the math topic you would like to explore.",
  ],
  thanks: [
    "You are so welcome. It makes me happy to help you make math easier at home.",
    "My pleasure. You are doing an amazing job supporting your child learning.",
    "You are welcome. It is wonderful to guide parents like you through math.",
    "Happy to help anytime. Keep up the great work with your child.",
  ],
  farewell: [
    "Take care. I will be right here whenever you want more help with math.",
    "See you soon. You are doing great. Keep making learning moments special.",
    "Bye for now. I hope math time feels smoother and more enjoyable.",
    "Thank you for visiting. You are building a strong math foundation at home.",
  ],
  ack: [
    "Great. What math idea shall we explore next together?",
    "Sounds lovely. Tell me which topic you would like to work through today.",
    "Perfect. I am ready when you are to make another math idea clear and simple.",
    "Wonderful. Which math topic would you like to focus on next?",
  ],
  shortNudge: [
    "I would love to help you with math. What topic would you like to start with today?",
    "Tell me the math idea that is on your mind, and I will guide you step by step.",
    "What math concept feels tricky right now? I will make it simple to understand.",
    "I am happy to help. Just share the math topic you would like to explore.",
  ],
  nonMath: [
    "I am here to help with math learning. Could you tell me the math topic you would like to begin with?",
    "My focus is on making math easier for families. What topic can I explain for you today?",
    "I can best help with math. Share any math topic, and we will explore it together warmly.",
    "Let us keep our chat about math so I can support you in the best way possible.",
  ],
} as const;

const pick = (arr: readonly string[]) =>
  arr[Math.floor(Math.random() * arr.length)];

/* ------------------------------------------------------------------------ */
/* 3) Pattern sets                                                          */
/* ------------------------------------------------------------------------ */

const GREETINGS = [
  /^(hi|hii+|hello+|hey+|hiya|howdy|hola|namaste|yo|sup|what(?:'| i)s up)\b/i,
  /\bgood (morning|afternoon|evening|night)\b/i,
];
const THANKS = [
  /^(thanks|thank you|thanks a lot|thanks so much|thx|ty|tysm|much appreciated|appreciate (it|that))\b/i,
  /\bcheers\b/i,
];
const FAREWELLS = [/^(bye|goodbye|see you|see ya|cya|later|take care)\b/i];
const ACKS = [
  /^(ok|okay|kk|k|cool|nice|great|awesome|got it|understood|sounds good|alright|sure)\b/i,
];

const QUESTION_CUES = [
  /\?/,
  /\b(how|why|what|when|where|which|who|explain|teach|show|derive|prove|solve|example|practice|help|again|clarify|meaning|definition)\b/i,
];

const OPERATOR_CUES = /[0-9]|[+\-*/=^%()]/;

/** Topic catalog incl. misspellings for fuzzy coverage */
const MATH_TOPICS = [
  "counting","addition","subtraction","multiplication","division","long division","factors","multiples","prime",
  "place value","rounding","number line","fractions","fraction","mixed number","decimal","percent","ratio","proportion",
  "measurement","unit","time","money","area","perimeter","volume","angle","shapes","triangle","quadrilateral","polygon",
  "geometry","coordinate plane","graph","slope","equation","inequality","expression","variable","exponent","power",
  "root","square root","order of operations","pemdas","mean","median","mode","range","data","statistics","probability",
  "algebra","linear equation","system of equations","quadratic","polynomial","factoring","function","domain","range-func",
  "sequence","series","arithmetic sequence","geometric sequence","absolute value",
  "trigonometry","sine","cosine","tangent","pythagorean","similarity","congruence","transformations",
  "calculus","limit","derivative","integral","rate of change","area under curve",
  "matrix","vector","coordinate geometry","logarithm","log","scientific notation",
  "fracton","fractin","devishon","divishon","devision","substraction","aljebra","algabra","multiplcation","percentge","percnt",
];

/* ------------------------------------------------------------------------ */
/* 4) Fuzzy topic detection                                                 */
/* ------------------------------------------------------------------------ */

const normalize = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();

function levenshtein(a: string, b: string) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

function looksMathyFuzzy(text: string): boolean {
  if (OPERATOR_CUES.test(text)) return true;
  const t = normalize(text);
  if (!t) return false;

  for (const topic of MATH_TOPICS) {
    if (t.includes(normalize(topic))) return true;
  }

  const tokens = t.split(" ").filter(Boolean);
  const topics = MATH_TOPICS.map(normalize);
  for (const tok of tokens) {
    if (tok.length < 3) continue;
    for (const topic of topics) {
      const d = levenshtein(tok, topic);
      if ((tok.length <= 5 && d <= 1) || (tok.length <= 8 && d <= 2) || d <= 3) {
        return true;
      }
    }
  }
  return false;
}

function firstTopicIn(text: string): string | null {
  const t = normalize(text);
  for (const topic of MATH_TOPICS) {
    if (t.includes(normalize(topic))) return topic;
  }
  return null;
}

/* ------------------------------------------------------------------------ */
/* 5) Local reply helpers                                                   */
/* ------------------------------------------------------------------------ */

const includesAny = (t: string, pats: RegExp[]) => pats.some((rx) => rx.test(t));

function smallTalkReply(text: string): string | null {
  const t = text.toLowerCase().trim();
  if (includesAny(t, GREETINGS)) return pick(VARIANTS.greeting);
  if (includesAny(t, THANKS)) return pick(VARIANTS.thanks);
  if (includesAny(t, FAREWELLS)) return pick(VARIANTS.farewell);
  if (includesAny(t, ACKS)) return pick(VARIANTS.ack);

  if (t.split(/\s+/).length <= 3 && !looksMathyFuzzy(t) && !includesAny(t, QUESTION_CUES)) {
    return pick(VARIANTS.shortNudge);
  }
  return null;
}

function nonMathRedirect(text: string): string | null {
  const t = text.toLowerCase().trim();
  const isQuestion = includesAny(t, QUESTION_CUES);
  const mathy = looksMathyFuzzy(t);
  if ((isQuestion && !mathy) || (!mathy && !isQuestion)) {
    return pick(VARIANTS.nonMath);
  }
  return null;
}

/* ------------------------------------------------------------------------ */
/* 6) Follow-up detection                                                   */
/* ------------------------------------------------------------------------ */

function looksLikeFollowUp(text: string): boolean {
  const t = normalize(text);
  const wordCount = t.split(" ").filter(Boolean).length;
  const hasCue =
    /\b(again|that|it|this|them|those|explain|meaning|definition)\b/.test(t) ||
    includesAny(t, QUESTION_CUES);
  const shortEnough = wordCount <= 10;
  return hasCue && shortEnough;
}

/* ------------------------------------------------------------------------ */
/* 7) Idempotency cache                                                     */
/* ------------------------------------------------------------------------ */

const TTL_MS = 10_000;
const recentReplies = new Map<string, CacheEntry>();

function cacheGet(key: string): string | null {
  const hit = recentReplies.get(key);
  if (!hit) return null;
  if (hit.expires > Date.now()) return hit.reply;
  recentReplies.delete(key);
  return null;
}
function cacheSet(key: string, reply: string) {
  recentReplies.set(key, { reply, expires: Date.now() + TTL_MS });
}

/* ------------------------------------------------------------------------ */
/* 8) OpenAI client (lazy init)                                             */
/* ------------------------------------------------------------------------ */

function getClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY. Set it in Vercel Project Settings > Environment Variables.");
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

/* ------------------------------------------------------------------------ */
/* 9) System prompt + context builder                                       */
/* ------------------------------------------------------------------------ */

const SYSTEM_PROMPT = `
You are MathParenting, a friendly helper speaking directly to the parent. Do not address the child. Do not ask for grade.

Always use this parent-first structure:
Start
Core Idea
Household Demonstration
The Math Behind It
Step-by-Step Teaching Guide
Curiosity Questions
Real-Life Connection or Fun Fact
Practice Together
Positive Close

Formatting rules:
• Start and Positive Close are content only. Do not show those section titles.
• All other section titles must be bold, no numbers, no hyphen bullets.
• Use simple language, short paragraphs, warm tone.
• Use KaTeX delimiters recognized by remark-math: inline math as $ ... $ and display math as $$ ... $$.
• Put every symbol or formula inside $ ... $ (e.g., $y$, $x$, $f(x)$, $ f'(x) $, $ \\frac{dy}{dx} $).
• Never write plain parentheses around variables or formulas (avoid "( y )", "( f(x) )").
• If a follow-up is short and vague, assume it refers to the most recent topic in this conversation and give a brief, gentle clarification with one or two tiny examples, then offer a small practice prompt.

If the question is not about math, kindly say you only help with math and invite them to share any math topic.
`.trim();

function buildMessagesWithContext(all: ChatMessage[], lastUser: string): ChatMessage[] {
  const msgs: ChatMessage[] = [{ role: "system", content: SYSTEM_PROMPT }];

  if (looksLikeFollowUp(lastUser) && !looksMathyFuzzy(lastUser)) {
    let recentTopic: string | null = null;

    for (let i = all.length - 2; i >= 0; i--) {
      const c = all[i]?.content ?? "";
      const specific = firstTopicIn(c);
      if (specific) {
        recentTopic = specific;
        break;
      }
      if (looksMathyFuzzy(c)) {
        recentTopic = "the recent math topic discussed above";
        break;
      }
    }

    if (recentTopic) {
      msgs.push({
        role: "system",
        content: `Context hint: The parent is asking a follow up about ${recentTopic}. Provide a gentle clarification speaking to the parent.`,
      });
    }
  }

  msgs.push(...all.filter((m) => m.role !== "system"));
  return msgs;
}

/* ------------------------------------------------------------------------ */
/* 10) KaTeX sanitizer ($...$, powers, integrals)                           */
/* ------------------------------------------------------------------------ */
/**
 * Fixes:
 * - \( ... \) -> $ ... $
 * - ( \frac{...}{...} ) / ( f(x) ) / ( y ) / ( 2 ) -> $ ... $
 * - “x to the power of 3”, “x power 3”, “x squared”, “x cubed” -> $ x^3 $ / $ x^2 $
 * - $ \int f(x),dx $ -> $ \int f(x)\,dx $
 */
function sanitizeKaTeX(reply: string): string {
  let out = reply;

  // 0) Convert \( ... \) or \[ ... \] to $...$ or $$...$$
  out = out.replace(/\\\(\s*([\s\S]*?)\s*\\\)/g, (_m, inner) => `$ ${inner} $`);
  out = out.replace(/\\\[\s*([\s\S]*?)\s*\\\]/g, (_m, inner) => `$$ ${inner} $$`);

  // 1) English power phrases -> $ ... $
  out = out.replace(
    /\b([A-Za-z][A-Za-z0-9]*)\s+(?:to\s+the\s+power\s+of|power)\s+(-?\d+)\b/gi,
    (_m, base, exp) => `$ ${base}^${exp} $`
  );
  out = out.replace(/\b([A-Za-z][A-Za-z0-9]*)\s+squared\b/gi, (_m, base) => `$ ${base}^2 $`);
  out = out.replace(/\b([A-Za-z][A-Za-z0-9]*)\s+cubed\b/gi, (_m, base) => `$ ${base}^3 $`);

  // 2) Parentheses-wrapped TeX commands -> $ ... $
  out = out.replace(
    /(?:^|[\s>])\(\s*(\\[a-zA-Z][^)]*?)\s*\)(?=[\s<.,;:!?)]|$)/g,
    (m, inner) => {
      const prefix = m.startsWith("(") ? "" : m[0];
      const content = typeof inner === "string" ? inner.trim() : inner;
      return `${prefix}$ ${content} $`;
    }
  );

  // 3) Parentheses-wrapped single variable or number -> $ ... $
  out = out.replace(
    /(?:^|[\s>])\(\s*([A-Za-z][A-Za-z0-9]*|-?\d+(?:\.\d+)?)\s*\)(?=[\s<.,;:!?)]|$)/g,
    (m, inner) => {
      const prefix = m.startsWith("(") ? "" : m[0];
      return `${prefix}$ ${inner} $`;
    }
  );

  // 4) Parentheses-wrapped simple function call -> $ ... $
  out = out.replace(
    /(?:^|[\s>])\(\s*([A-Za-z][A-Za-z0-9']*\s*\([^()]*\))\s*\)(?=[\s<.,;:!?)]|$)/g,
    (m, inner) => {
      const prefix = m.startsWith("(") ? "" : m[0];
      return `${prefix}$ ${inner} $`;
    }
  );

  // 5) Fix integral comma spacing inside existing $...$
  out = out.replace(/\$\s*\\int([\s\S]*?),\s*dx\s*\$/g, (_m, inner) => `$ \\int${inner} \\,dx $`);

  return out;
}

/* ------------------------------------------------------------------------ */
/* 11) POST handler                                                         */
/* ------------------------------------------------------------------------ */

export async function POST(req: Request) {
  try {
    const { messages, idempotencyKey } = (await req.json()) as ChatRequest;

    if (!messages?.length) {
      return NextResponse.json({ error: "No messages provided." }, { status: 400 });
    }

    const lastUser = (messages.filter((m) => m.role === "user").pop()?.content || "").trim();

    // Free local friendly replies
    const quick = smallTalkReply(lastUser);
    if (quick) return NextResponse.json({ reply: quick });

    // Gentle redirect if clearly non-math and no context
    const redirect = nonMathRedirect(lastUser);
    if (redirect) return NextResponse.json({ reply: redirect });

    // Idempotency cache (dedupe)
    if (idempotencyKey) {
      const cached = cacheGet(idempotencyKey);
      if (cached) return NextResponse.json({ reply: cached });
    }

    // Build messages with optional context hint
    const payload = buildMessagesWithContext(messages, lastUser);

    const client = getClient();
    const completion = await client.chat.completions.create({
      model: "gpt-4.1",
      temperature: 0.4,
      messages: payload,
    });

    const raw =
      completion.choices?.[0]?.message?.content ??
      "Sorry, I could not generate a response. Please try again.";

    // Auto-fix KaTeX and phrasing
    const reply = sanitizeKaTeX(raw);

    if (idempotencyKey) cacheSet(idempotencyKey, reply);

    return NextResponse.json({ reply });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("/api/chat error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
