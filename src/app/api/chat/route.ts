import { NextResponse } from "next/server";
import OpenAI from "openai";

/**
 * Friendly local handling (free):
 * - Greetings / Thanks / Acknowledgements / Farewells → rotating variants
 * - Non-math questions/requests → gentle redirect
 * Math questions → GPT-4.1
 */

// ---------- Patterns ----------
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
const FAREWELLS = [
  /^(bye|goodbye|see you|see ya|cya|later|talk to you (later|soon)|take care)\b/i,
];
const ACKS = [
  /^(ok|okay|kk|k|cool|nice|great|awesome|got it|understood|sounds good|alright|sure)\b/i,
];
const QUESTION_CUES = [/\?/, /\b(how|why|what|when|where|which|who|explain|teach|show|derive|prove|solve|example|practice|help)\b/i];
const MATH_CUES = [
  /[0-9]/,
  /[+\-*/=^%()]/,
  /\b(grade|topic|math|arithmetic|algebra|geometry|fraction|decimal|percent|ratio|proportion|prime|factor|multiple|equation|inequality|graph|coordinate|slope|angle|triangle|area|perimeter|volume|probability|statistics|mean|median|mode|range|derivative|integral|limit|calculus|trigonometry|sin|cos|tan|vector|matrix|exponent|logarithm|log)\b/i,
];
const NON_MATH_TOPICS = [
  /\b(politics|election|president|government|policy|law|news|war)\b/i,
  /\b(religion|god|faith|spiritual|church|temple|mosque)\b/i,
  /\b(gender|sex|sexual|lgbt|identity)\b/i,
  /\b(supabase|vercel|next\.?js|git|github|api|backend|frontend|deploy|database|stripe|analytics)\b/i,
  /\b(health|medical|diagnosis|therapy)\b/i,
  /\b(finance|stock|crypto|trading|money|loan)\b/i,
];

// ---------- Friendly rotating variants ----------
const VARIANTS = {
  greeting: [
    "Welcome to MathParenting. How can I help you with math today?",
    "Welcome to MathParenting—how would you like me to help with math today?",
    "Hi there. Welcome to MathParenting. How can I support you with math today?",
    "Hello! Welcome to MathParenting. What can I help you with in math today?",
  ],
  thanks: [
    "You're welcome. If you'd like help with another math topic, I'm here.",
    "You're welcome. I'm glad to help—tell me the next math topic when you're ready.",
    "You're welcome. Whenever you need more math support, just let me know.",
    "You're welcome. I’m here anytime you want to work on another math concept.",
  ],
  farewell: [
    "Take care. If you need math help again, just ask.",
    "Goodbye for now. I’m here anytime you want support with math.",
    "See you later. I’ll be ready when you want to tackle another math topic.",
    "Bye! Come back anytime for friendly math guidance.",
  ],
  ack: [
    "Great—tell me the math topic and your child’s grade when you’re ready.",
    "Sounds good. What math concept would you like to work on next?",
    "Got it. Share the math topic and I’ll guide you step by step.",
    "Okay—what would you like help with in math?",
  ],
  shortNudge: [
    "Tell me the math topic and your child’s grade, and I’ll guide you step by step.",
    "Share the math topic and grade, and I’ll walk you through it clearly.",
    "Let me know the math topic and your child’s grade so we can begin.",
    "Tell me the topic and grade, and I’ll get you a simple plan.",
  ],
  nonMath: [
    "I focus on helping parents teach math. If you share the math topic and your child’s grade, I’ll guide you clearly.",
    "I’m here especially for math support. Tell me the math topic and your child’s grade, and I’ll walk you through it.",
    "Math is my specialty for parents and kids. Share the topic and grade, and we’ll start together.",
    "I can help with math learning at home. Let me know the topic and your child’s grade to begin.",
  ],
} as const;

const pick = (arr: readonly string[]) => arr[Math.floor(Math.random() * arr.length)];
const includesAny = (t: string, pats: RegExp[]) => pats.some((rx) => rx.test(t));
const looksLikeQuestion = (t: string) => includesAny(t, QUESTION_CUES);
const looksMathy = (t: string) => includesAny(t, MATH_CUES);
const looksNonMathTopic = (t: string) => includesAny(t, NON_MATH_TOPICS);

function localSmallTalk(text: string): string | null {
  const t = text.toLowerCase().trim();
  if (includesAny(t, GREETINGS)) return pick(VARIANTS.greeting);
  if (includesAny(t, THANKS)) return pick(VARIANTS.thanks);
  if (includesAny(t, FAREWELLS)) return pick(VARIANTS.farewell);
  if (includesAny(t, ACKS)) return pick(VARIANTS.ack);
  if (t.split(/\s+/).length <= 3 && !looksMathy(t) && !looksLikeQuestion(t)) {
    return pick(VARIANTS.shortNudge);
  }
  return null;
}

function localNonMathRedirect(text: string): string | null {
  const t = text.toLowerCase().trim();
  if ((looksLikeQuestion(t) && !looksMathy(t)) || looksNonMathTopic(t)) {
    return pick(VARIANTS.nonMath);
  }
  return null;
}

// --------- Idempotency cache (10s TTL) ---------
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

// --------- Request types ---------
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
        { error: "Missing OPENAI_API_KEY (set it in Vercel → Project → Settings → Environment Variables)" },
        { status: 500 }
      );
    }

    // ✅ Lazy-create OpenAI client ONLY after we know the key exists
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const last = (messages[messages.length - 1]?.content || "").trim();

    // 1) Friendly local replies (free)
    const smallTalk = localSmallTalk(last);
    if (smallTalk) return NextResponse.json({ reply: smallTalk });

    // 2) Friendly non-math redirect (free)
    const nonMath = localNonMathRedirect(last);
    if (nonMath) return NextResponse.json({ reply: nonMath });

    // 3) Idempotency check
    if (idempotencyKey) {
      const cached = getCachedReply(idempotencyKey);
      if (cached) return NextResponse.json({ reply: cached });
    }

    // 4) Real math → OpenAI (GPT-4.1)
    const systemPrompt = `
You are MathParenting, a friendly AI that ONLY helps parents teach math to their children.
- Be warm, encouraging, and concise.
- Use clear everyday language and household-friendly ideas.
- Explain formulas and what each symbol means.
- Provide a short guided practice and a few extra practice questions at the end.
- If asked about non-math topics, politely say you only help with math for parents and children.
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4.1",
      temperature: 0.4,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.filter((m) => m.role !== "system"),
      ],
    });

    const reply =
      completion.choices?.[0]?.message?.content ??
      "Sorry, I couldn't generate a response. Please try again.";

    if (idempotencyKey) setCachedReply(idempotencyKey, reply);

    return NextResponse.json({ reply });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("/api/chat error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
