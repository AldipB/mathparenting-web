import { NextResponse } from "next/server";
import OpenAI from "openai";

/**
 * Friendly local handling (free) + fuzzy math-topic detection + follow-up context:
 * - Greetings / Thanks / Acknowledgements / Farewells → rotating variants
 * - Non-math → gentle redirect
 * - Real math → GPT-4.1 with parent-friendly prompt
 * No grade requests. Always warm and encouraging.
 */

/* ---------------- Friendly variants (no dashes) ---------------- */

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

const pick = (arr: readonly string[]) => arr[Math.floor(Math.random() * arr.length)];

/* ---------------- Pattern helpers ---------------- */

const GREETINGS = [
  /^(hi|hii+|hello+|hey+|hiya|howdy|hola|namaste|yo|sup|what(?:'| i)s up)\b/i,
  /\bgood (morning|afternoon|evening|night)\b/i,
  /\bgm\b/i,
  /\bgn\b/i,
];
const THANKS = [
  /^(thanks|thank you|thanks a lot|thanks so much|thx|ty|tysm|much appreciated|appreciate (it|that))\b/i,
  /\bcheers\b/i,
];
const FAREWELLS = [/^(bye|goodbye|see you|see ya|cya|later|take care)\b/i];
const ACKS = [/^(ok|okay|kk|k|cool|nice|great|awesome|got it|understood|sounds good|alright|sure)\b/i];

const QUESTION_CUES = [/\?/, /\b(how|why|what|when|where|which|who|explain|teach|show|derive|prove|solve|example|practice|help|again|clarify)\b/i];

const OPERATOR_CUES = /[0-9]|[+\-*/=^%()]/;

/** Catalog of math topics with a few common misspellings for typo tolerance */
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
  // common misspellings
  "fracton","fractin","devishon","divishon","devision","substraction","aljebra","algabra","multiplcation","percentge","percnt",
];

function norm(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}
function lev(a: string, b: string) {
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
function fuzzyIncludesTopic(text: string): boolean {
  if (OPERATOR_CUES.test(text)) return true;
  const t = norm(text);
  if (!t) return false;

  for (const topic of MATH_TOPICS) {
    if (t.includes(topic)) return true;
  }

  const tokens = t.split(" ").filter(Boolean);
  const topics = MATH_TOPICS.map(norm);
  for (const tok of tokens) {
    if (tok.length < 3) continue;
    for (const topic of topics) {
      const d = lev(tok, topic);
      if ((tok.length <= 5 && d <= 1) || (tok.length <= 8 && d <= 2) || d <= 3) {
        return true;
      }
    }
  }
  return false;
}
function firstTopicFound(text: string): string | null {
  const t = norm(text);
  for (const topic of MATH_TOPICS) {
    if (t.includes(norm(topic))) return topic;
  }
  return null;
}
function includesAny(t: string, pats: RegExp[]) {
  return pats.some((rx) => rx.test(t));
}

/* Follow up detector: short vague questions that likely refer back to the last topic */
function looksLikeFollowUp(text: string) {
  const t = norm(text);
  const wordCount = t.split(" ").filter(Boolean).length;
  const hasCue = /\b(again|that|it|this|them|those|explain|meaning|definition)\b/.test(t) || includesAny(t, QUESTION_CUES);
  const notLong = wordCount <= 10;
  return hasCue && notLong;
}

function localSmallTalk(text: string): string | null {
  const t = text.toLowerCase().trim();
  if (includesAny(t, GREETINGS)) return pick(VARIANTS.greeting);
  if (includesAny(t, THANKS)) return pick(VARIANTS.thanks);
  if (includesAny(t, FAREWELLS)) return pick(VARIANTS.farewell);
  if (includesAny(t, ACKS)) return pick(VARIANTS.ack);
  if (t.split(/\s+/).length <= 3 && !fuzzyIncludesTopic(t) && !includesAny(t, QUESTION_CUES)) {
    return pick(VARIANTS.shortNudge);
  }
  return null;
}
function localNonMathRedirect(text: string): string | null {
  const t = text.toLowerCase().trim();
  const looksQuestion = includesAny(t, QUESTION_CUES);
  const looksMath = fuzzyIncludesTopic(t);
  if ((looksQuestion && !looksMath) || (!looksMath && !looksQuestion)) {
    return pick(VARIANTS.nonMath);
  }
  return null;
}

/* Idempotency cache */
type CacheEntry = { reply: string; expires: number };
const recentReplies = new Map<string, CacheEntry>();
const TTL_MS = 10_000;
function getCachedReply(key: string): string | null {
  const hit = recentReplies.get(key);
  if (hit && hit.expires > Date.now()) return hit.reply;
  if (hit) recentReplies.delete(key);
  return null;
}
function setCachedReply(key: string, reply: string) {
  recentReplies.set(key, { reply, expires: Date.now() + TTL_MS });
}

/* Types */
type ChatMessage = { role: "user" | "assistant" | "system"; content: string };
type ChatRequest = { messages: ChatMessage[]; idempotencyKey?: string };

export async function POST(req: Request) {
  try {
    const { messages, idempotencyKey } = (await req.json()) as ChatRequest;

    if (!messages?.length) {
      return NextResponse.json({ error: "No messages provided." }, { status: 400 });
    }
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY. Set it in Vercel Project Settings under Environment Variables." },
        { status: 500 }
      );
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const lastUser = (messages.filter(m => m.role === "user").pop()?.content || "").trim();

    // Friendly local replies
    const smallTalk = localSmallTalk(lastUser);
    if (smallTalk) return NextResponse.json({ reply: smallTalk });

    // Non math redirect
    const nonMath = localNonMathRedirect(lastUser);
    if (nonMath) return NextResponse.json({ reply: nonMath });

    // Idempotency
    if (idempotencyKey) {
      const cached = getCachedReply(idempotencyKey);
      if (cached) return NextResponse.json({ reply: cached });
    }

    // Build system prompt and optionally add a context hint for follow ups
    const systemPrompt = `
You are MathParenting, a friendly assistant that ONLY helps parents teach math.
Always be warm, calm, and encouraging. Do not ask for the child grade.
Use simple everyday language and household examples. Explain any symbol you introduce.
If the parent asks a short follow up like "what is denominator again" or "explain that" assume they refer to the most recent topic in the conversation and clarify gently with one or two examples. Keep answers concise, then give a few practice items.

Suggested structure when helpful:
Intro
Core idea explained simply
Home demo using household items
Formula with symbols and short meaning of each symbol
Guided practice with one to three items
Curiosity or tip
Answer box if a specific problem was asked
Extra practice with two to four items

If the question is not about math, kindly say you only help with math and invite them to share a math topic.
`.trim();

    const msgs: ChatMessage[] = [{ role: "system", content: systemPrompt }];

    // If last user message looks like a follow up and does not explicitly contain a math topic,
    // add a context hint summarizing the recent topic from prior messages.
    if (looksLikeFollowUp(lastUser) && !fuzzyIncludesTopic(lastUser)) {
      // scan backward for a topic in prior messages
      let recentTopic: string | null = null;
      for (let i = messages.length - 2; i >= 0; i--) {
        const c = messages[i].content || "";
        const t = firstTopicFound(c);
        if (t) { recentTopic = t; break; }
        if (fuzzyIncludesTopic(c)) {
          // as a fallback, mark generic
          recentTopic = "the recent math topic discussed above";
          break;
        }
      }
      if (recentTopic) {
        msgs.push({
          role: "system",
          content: `Context hint: The parent is asking a follow up about ${recentTopic}. Provide a gentle clarification that builds on the earlier explanation.`,
        });
      }
    }

    msgs.push(...messages.filter((m) => m.role !== "system"));

    const completion = await client.chat.completions.create({
      model: "gpt-4.1",
      temperature: 0.4,
      messages: msgs,
    });

    const reply =
      completion.choices?.[0]?.message?.content ??
      "Sorry, I could not generate a response. Please try again.";

    if (idempotencyKey) setCachedReply(idempotencyKey, reply);

    return NextResponse.json({ reply });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("/api/chat error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
