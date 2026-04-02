export const runtime = "edge";

import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getServerSupabase } from "@/lib/supabaseServer";

/* =========================================================================
   Types
   ========================================================================= */
type ChatRole = "user" | "assistant" | "system";
type Part = { type: "text"; text: string } | { type: "image_url"; image_url: string };

type ChatMessage = { role: ChatRole; content?: string; contentParts?: Part[] };

type ChatRequest = {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
  keep?: number;
  mode?: "teaching";
};

type ExtractedQuestion = {
  id: string;
  label?: string;
  text: string;
  subparts?: string[];
  confidence?: number;
};

type QuestionExtractResponse = {
  questions: ExtractedQuestion[];
};

/* =========================================================================
   Small helpers
   ========================================================================= */
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(Math.random() * arr.length)];

const GREETING_RX =
  /^(hi|hii+|hello+|hey+|hiya|howdy|hola|namaste|yo|sup|good (morning|afternoon|evening|night))\b/i;

const THANKS_RX =
  /^(thank you|thanks|thank u|thankyou|thx|ty|cheers|much appreciated|appreciate it|appreciate that|that was helpful|that helped|great help|you are amazing|you are great|you are helpful|awesome|perfect|wonderful|brilliant)\b/i;

const GREETINGS_ONE_LINERS = [
  "Hello. Tell me a K to 12 math topic or question and I will help you teach it at home.",
  "Hi. What math topic are you working on with your child today.",
  "Namaste. Share a K to 12 math question and I will guide you step by step.",
  "Hey. What is your child working on in math right now? Let us figure it out together.",
  "Hello. Drop a math question or topic and I will help you guide your child through it calmly.",
  "Hi there. What math challenge can I help you and your child tackle today.",
  "Good to see you. Share a math topic or problem and we will work through it together.",
  "Hello. Whether it is fractions, algebra, or anything in between, I am here to help you teach it.",
  "Hi. Tell me what your child is learning right now and I will help you explain it simply.",
  "Hey there. What math topic would you like to explore with your child today.",
  "Welcome. Share a math question and I will give you a clear step by step teaching plan.",
  "Hello. I am here to help you turn homework time into a calm and confident teaching moment.",
  "Hi. What is on your child's math worksheet today? Let us break it down together.",
  "Hey. Tell me the math topic and I will help you explain it in a way that makes sense at home.",
  "Hello. Share what your child is struggling with and I will help you guide them through it.",
] as const;

const THANKS_ONE_LINERS = [
  "You are welcome. Come back anytime you have a math question.",
  "Happy to help. Feel free to share another math topic whenever you are ready.",
  "Glad that helped. What math topic would you like to work on next.",
  "Anytime. I am here whenever you need help teaching math at home.",
  "You are very welcome. Keep up the great work with your child.",
  "Happy to be here. Let me know when you have another math question.",
  "Glad it was useful. You are doing great as a math mentor for your child.",
  "Of course. Come back whenever you need help breaking down a math topic.",
] as const;

const NON_MATH_ONE_LINERS = [
  "I focus on math learning support for parents and children. Ask me a math question and I will help you clearly.",
  "That is outside what I can help with. Share a math topic or question and I will guide you step by step.",
  "I am built specifically for math support between parents and children. What math topic can I help you with today.",
  "I can only help with math questions. What is your child working on right now.",
  "That one is outside my area. I am here for math questions only. Drop a topic or problem and let us get started.",
  "I am a math support tool for parents. If you have a math question or homework problem, I am ready to help.",
  "I stick to math. Tell me what your child is learning and I will help you teach it.",
  "That is not something I can help with. But if you have a math question, I am here and ready to walk you through it.",
  "My focus is math support for parents and children. What topic or problem would you like help with today.",
  "I am only able to help with math related questions. Share a topic or problem and we will work through it together.",
  "That falls outside what I do. I am here to help you teach math at home. What is on your child's plate today.",
  "I can not help with that. But bring me any math question and I will give you a clear teaching plan for it.",
] as const;

const normalize = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

function extractText(m?: ChatMessage) {
  if (!m) return "";
  if (m.contentParts?.length) {
    return m.contentParts
      .filter((p) => p.type === "text")
      .map((p: any) => p.text || "")
      .join(" ")
      .trim();
  }
  return (m.content || "").trim();
}

function levenshtein(a: string, b: string) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

/* =========================================================================
   Photo multi question support
   ========================================================================= */
const QUESTIONS_MARKER = "[MP_EXTRACTED_QUESTIONS]";

function parseSelectionIndex(text: string): number | null {
  const t = normalize(text);
  const m = t.match(/\b(question|q|no|number|#)\s*(\d+)\b/);
  if (m?.[2]) {
    const n = parseInt(m[2], 10);
    return Number.isFinite(n) ? n : null;
  }
  if (/\b(first|1st)\b/.test(t)) return 1;
  if (/\b(second|2nd)\b/.test(t)) return 2;
  if (/\b(third|3rd)\b/.test(t)) return 3;
  if (/\b(fourth|4th)\b/.test(t)) return 4;
  if (/\b(fifth|5th)\b/.test(t)) return 5;
  const onlyNum = t.match(/^\s*(\d+)\s*$/);
  if (onlyNum?.[1]) {
    const n = parseInt(onlyNum[1], 10);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function formatQuestionListForUser(qs: ExtractedQuestion[]) {
  const lines: string[] = [];
  lines.push("I found multiple questions in your photo.");
  lines.push("Send the question number you want.");
  lines.push("");
  for (let i = 0; i < qs.length; i++) {
    const q = qs[i];
    const n = i + 1;
    const preview = (q.text || "").replace(/\s+/g, " ").trim().slice(0, 160);
    lines.push(`Question ${n}: ${preview}${(q.text || "").length > 160 ? " ..." : ""}`);
  }
  return lines.join("\n");
}

function findSavedExtractedQuestions(history: ChatMessage[]): ExtractedQuestion[] | null {
  for (let i = history.length - 1; i >= 0; i--) {
    const m = history[i];
    const txt = extractText(m);
    if (!txt) continue;
    if (txt.startsWith(QUESTIONS_MARKER)) {
      const jsonText = txt.slice(QUESTIONS_MARKER.length).trim();
      try {
        const parsed = JSON.parse(jsonText) as QuestionExtractResponse;
        if (parsed?.questions?.length) return parsed.questions;
      } catch {
        return null;
      }
    }
  }
  return null;
}

/* =========================================================================
   Better image extraction
   ========================================================================= */
const ASK_WORDS_RX =
  /\b(find|solve|evaluate|simplify|compute|determine|calculate|work out|prove|show|derive|differentiate|integrate|factor|expand)\b/i;

const DIRECT_QUESTION_RX =
  /\?|\bhow (fast|many|much|long|far|tall|old)\b|\bwhat\b|\bwhich\b|\bwhy\b|\bwhen\b/i;

const EQUATIONISH_RX = /^\s*([a-z][a-z0-9_]*|[xyzt])\s*=\s*.+$/i;

function isLikelyAskLine(s: string) {
  const t = (s || "").trim();
  if (!t) return false;
  if (DIRECT_QUESTION_RX.test(t)) return true;
  if (ASK_WORDS_RX.test(t)) return true;
  if (EQUATIONISH_RX.test(t) && !ASK_WORDS_RX.test(t) && !DIRECT_QUESTION_RX.test(t)) return false;
  return false;
}

function isLikelyGivenEquationLine(s: string) {
  const t = (s || "").trim();
  if (!t) return false;
  if (/^\s*(given|use|let)\b/i.test(t)) return true;
  if (EQUATIONISH_RX.test(t) && !ASK_WORDS_RX.test(t) && !DIRECT_QUESTION_RX.test(t)) return true;
  if (/^[^?]{0,80}=\s*[^?]{0,80}$/.test(t) && !ASK_WORDS_RX.test(t) && !DIRECT_QUESTION_RX.test(t)) return true;
  return false;
}

function postprocessExtractedQuestions(qs: ExtractedQuestion[]): ExtractedQuestion[] {
  const cleaned = (qs || [])
    .map((q, i) => ({ ...q, id: q.id || `Q${i + 1}`, text: (q.text || "").trim() }))
    .filter((q) => q.text.length);

  if (!cleaned.length) return cleaned;

  const ask = cleaned.filter((q) => isLikelyAskLine(q.text));
  const given = cleaned.filter((q) => isLikelyGivenEquationLine(q.text));

  if (ask.length === 1 && given.length >= 1) {
    const askText = ask[0].text.trim();
    const givens = given.map((g) => g.text.trim()).filter((t) => t && t !== askText);
    const mergedText = `${askText}\n\nGiven:\n` + givens.map((t) => `- ${t}`).join("\n");
    return [{
      id: "Q1",
      label: ask[0].label,
      text: mergedText,
      subparts: ask[0].subparts,
      confidence: Math.max(ask[0].confidence ?? 0.7, 0.7),
    }];
  }

  if (!ask.length) return cleaned;

  const keep = cleaned.filter((q) => {
    if (isLikelyAskLine(q.text)) return true;
    if (isLikelyGivenEquationLine(q.text)) return false;
    return true;
  });

  return keep.length ? keep : cleaned;
}

async function extractQuestionsFromImages(client: OpenAI, parts: Part[]): Promise<QuestionExtractResponse | null> {
  const imageParts = (parts || []).filter((p) => p.type === "image_url");
  if (!imageParts.length) return null;

  const extractionPrompt =
    "Task: Extract the math QUESTION(S) the student is being asked to answer.\n" +
    "Do NOT list standalone GIVEN equations, definitions, or intermediate lines as separate questions.\n" +
    "If the image has ONE question plus multiple given equations, return ONE question whose text includes the ask line plus the givens.\n" +
    "\n" +
    "Return JSON only using this schema:\n" +
    '{"questions":[{"id":"Q1","label":"(visible number if any)","text":"full question text including givens when needed","subparts":["a) ...","b) ..."],"confidence":0.0}]}\n' +
    "\n" +
    "Rules:\n" +
    "1) Keep wording close to the image.\n" +
    "2) Split only when there are truly multiple separate questions.\n" +
    "3) Preserve visible numbering in label if present.\n" +
    "4) If uncertain, still return the best single question with lower confidence.\n";

  const content: any[] = [
    { type: "text", text: extractionPrompt },
    ...imageParts.map((p) => ({ type: "image_url", image_url: { url: p.image_url } })),
  ];

  const resp = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    max_tokens: 900,
    messages: [
      { role: "system", content: "You extract only the actual asked questions. Output must be valid JSON only." },
      { role: "user", content },
    ],
    response_format: { type: "json_object" } as any,
  });

  const raw = resp.choices?.[0]?.message?.content || "";
  let parsed: QuestionExtractResponse | null = null;

  try {
    parsed = JSON.parse(raw) as QuestionExtractResponse;
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try { parsed = JSON.parse(raw.slice(start, end + 1)) as QuestionExtractResponse; } catch {}
    }
  }

  if (!parsed?.questions?.length) return null;
  const fixed = postprocessExtractedQuestions(parsed.questions);
  return fixed.length ? { questions: fixed } : null;
}

/* =========================================================================
   Fix for photo marker leaking into the visible answer
   ========================================================================= */
function stripMarkerFromText(t: string) {
  if (!t) return t;
  const idx = t.indexOf(QUESTIONS_MARKER);
  if (idx === -1) return t;
  const before = t.slice(0, idx).trimEnd();
  if (before.length === 0) return "";
  return before;
}

function sanitizeIncomingMessages(msgs: ChatMessage[]) {
  return (msgs || []).map((m) => {
    const next: ChatMessage = { ...m };
    if (typeof next.content === "string") {
      next.content = stripMarkerFromText(next.content);
    }
    if (Array.isArray(next.contentParts)) {
      next.contentParts = next.contentParts.map((p) => {
        if (p.type === "text") return { ...p, text: stripMarkerFromText(p.text) };
        return p;
      });
    }
    return next;
  });
}

/* =========================================================================
   Topic + problem detection
   ========================================================================= */
const OPERATOR_RX =
  /[0-9][^a-zA-Z]*[+\-*/=^()%]|[+\-*/=^]{1,2}\s*[0-9]|\\frac|\\sqrt|\\int|\\sum|\\pi|\\theta|\\alpha|\\beta|∞/;

const TOPIC_BUCKETS = [
  "math","arithmetic","algebra","prealgebra","geometry","trigonometry","precalculus","calculus",
  "statistics","probability","number theory","linear algebra","discrete math","set theory","logic",
  "counting","place value","whole numbers","natural numbers","integers","even","odd","addition",
  "subtraction","multiplication","division","long division","factors","multiples","prime","composite",
  "lcm","hcf","gcd","number line","rounding","estimation","order of operations","pemdas","bodmas",
  "powers","indices","exponents","roots","square root","cube root","surds","fraction","fractions",
  "mixed number","improper fraction","equivalent fractions","simplify fractions","decimal","percent",
  "percents","ratio","rate","proportion","unit rate","units","unit conversion","metric","imperial",
  "time","elapsed time","money","temperature","perimeter","area","surface area","volume","nets",
  "angle","acute","obtuse","right angle","triangle","isosceles","equilateral","scalene","quadrilateral",
  "rectangle","square","parallelogram","rhombus","trapezoid","polygon","regular polygon","circle",
  "radius","diameter","circumference","arc length","sector area","pythagorean","similarity","congruence",
  "transformations","reflection","rotation","translation","dilation","scale factor","coordinates",
  "cartesian plane","distance formula","midpoint","variable","expression","equation","inequality",
  "absolute value","evaluate","simplify","linear expression","linear equation","slope","intercept",
  "slope intercept","point slope","graphing lines","system of equations","substitution","elimination",
  "quadratic","factoring","expand","complete the square","quadratic formula","discriminant","polynomial",
  "degree","remainder theorem","binomial theorem","function","functions","domain","range","composition",
  "inverse function","piecewise","interval notation","graph","graphs","scatter plot","histogram",
  "box plot","line graph","bar graph","pie chart","dot plot","two-way table","frequency table",
  "best fit line","correlation","residual","mean","median","mode","range","quartiles","iqr",
  "standard deviation","variance","experiment","sample space","outcomes","permutations","combinations",
  "factorial","binomial","normal distribution","z score","unit circle","radians","degrees","sine",
  "cosine","tangent","secant","cosecant","cotangent","right triangle trigonometry","special right triangles",
  "trig identities","law of sines","law of cosines","sequences","series","arithmetic sequence",
  "geometric sequence","sigma notation","limits","limit","derivative","derivatives","differentiation",
  "chain rule","product rule","quotient rule","critical points","optimization","integral","integrals",
  "integration","area under curve","riemann sum","vector","vectors","magnitude","direction","dot product",
  "cross product","matrix","matrices","determinant","inverse matrix","gaussian elimination","set","sets",
  "union","intersection","complement","venn diagram","truth table","implication","contrapositive",
  "simple interest","compound interest","interest rate","mortgage","loan payment","amortization","budget",
  "tax","sales tax","discount","tip","markup","depreciation","break even","unit price","velocity",
  "speed","acceleration","distance","displacement","slope from data","differantation","fracton",
  "devishon","substraction","aljebra","algabra","multiplcation","percentsge","equasion",
];

function looksClearlyNonMath(t: string) {
  const n = normalize(t);
  const banned = [
    "politic","election","president","prime minister","war","religion","celebrity","gossip","movie",
    "song","recipe","travel visa","immigration","diagnosis","medical advice","backend","api key",
    "openai","prompt","system prompt","source code",
  ];
  return banned.some((w) => n.includes(w));
}

function looksMathy(text: string): { ok: boolean; bestGuess?: string } {
  if (OPERATOR_RX.test(text)) return { ok: true };
  const t = normalize(text);
  if (!t) return { ok: false };

  for (const topic of TOPIC_BUCKETS) {
    const k = normalize(topic);
    if (t.includes(k)) return { ok: true, bestGuess: topic };
  }

  const tokens = t.split(" ").filter(Boolean);
  let best: { d: number; topic: string } | null = null;
  for (const tok of tokens) {
    if (tok.length < 3) continue;
    for (const topic of TOPIC_BUCKETS) {
      const key = normalize(topic).split(" ").slice(-1)[0];
      const d = Math.min(levenshtein(tok, key), levenshtein(tok, normalize(topic)));
      const pass = (tok.length <= 5 && d <= 1) || (tok.length <= 8 && d <= 2) || d <= 3;
      if (pass) {
        if (!best || d < best.d) best = { d, topic };
      }
    }
  }
  if (best) return { ok: true, bestGuess: best.topic };
  return { ok: false };
}

const PROBLEM_RX = /(solve|simplify|evaluate|find|compute|factor|expand|differentiate|derive|integrate|derivative|integral|roots?|zeros?|intercepts?|prove|show)\b|[=±√^*/()]/i;

function isProblemLike(text: string) {
  const t = text.trim();
  if (!t) return false;
  if (t.endsWith("?")) return true;
  return PROBLEM_RX.test(t);
}

/* =========================================================================
   System prompt
   ========================================================================= */
const SYSTEM_PROMPT = `
You are MathParenting, a warm coach for PARENTS.
Parents come to you because their child has a homework question they are stuck on or got wrong.
Your job is to brief the parent privately so they can sit with their child and guide them through the actual homework question step by step.
You are not answering the question for the child. You are teaching the parent how to explain it.

SCOPE
- You can answer math, finance, and accounting questions.
- Keep tone parent focused at all times.
- If the message is clearly not learning related, respond with ONE short redirect sentence only, then stop.

RELATIONSHIP FIRST RULES
- Always reduce pressure and shame. Normalize mistakes.
- Always encourage the parent to pause and let the child try before revealing the next step.
- Always use collaborative language like "let us" and "together".
- Always include one small household link that feels natural.
- Never force a household story if it does not fit. Keep it simple and skip it if it feels forced.

KATEX AND MATH NOTATION
- Use KaTeX for all math expressions.
- Inline math uses \\( ... \\)
- Display math uses $$ ... $$
- Do not show raw plaintext math.

CLARITY WITH LOW TOKENS
- Be concise, no repeats, no extra filler.
- Keep every line short.
- Every section must be skimmable in under 20 seconds.
- Maximum 3 sentences per paragraph anywhere in the response.
- How to teach this must have maximum 3 steps for most topics. Only go to 5 if the topic genuinely requires it.
- Extra practice must be exactly 2 questions unless the user asks for more.
- If things get hard blocks must be 2 lines max each. No long speeches.
- If in doubt, write less. A parent can always ask for more detail.

CRITICAL OUTPUT RULES FOR DETAILS
- Never put <details> inside bullet points or numbered list items.
- Always add a blank line before <details> and after </details>.
- <details> and <summary> start at the beginning of the line, no leading spaces.
- The <summary> line must contain ONLY the title words, and nothing else.

ABSOLUTE OUTPUT FORMAT
- Always output sections in this order.
- Headings are bold and on their own line.

**⏱️ Parent Quick Plan**
Write these 3 lines, each as its own paragraph:
**Today we are working on:** ... (describe the homework question in one plain sentence)
**You only need to remember:** ... (the single most important concept for this question)
**First question to ask your child:** ... (a warm connection question, not a test)

Immediately after, add ONE details block:

<details>
<summary><strong>Show answer</strong></summary>

**Answer:** ... (the correct answer to the homework question, clear and calm)
**Why:** ... (1 short line explaining the key step, no shame)

</details>

Then add this block:
**Quick check for you (the parent):** Before sitting with your child, ask yourself: "Do I feel ready to explain this?"

- If yes → Open How to teach this below and walk through it with your child using their actual homework question.
- If kind of → Read How to teach this once yourself first, then sit down with your child.
- If no → Start with Do this together at home to build your own confidence first, then return to the homework question together.

**🧠 Core Idea**
Use 3 short lines:
**Meaning:** ...
**Picture in your head:** ...
**Real life hook:** ... (home based and simple)

**👨‍👩‍👧 How to teach this**
Start with:
**Goal:** ... (what the child should be able to do by the end)

Then Step 1 to Step 5 max.
Every step must show the math move if any.
Always include a tiny pause cue in the step text like "Pause here and let them try".
All steps must be directly relevant to solving the actual homework question.

Each step format:

**Step 1:** ...

If math, add display KaTeX:
$$ ... $$

Then these 3 details blocks in order:

<details>
<summary><strong>You say</strong></summary>

(what the parent says to the child, very short, warm, collaborative)
(why this step matters, one sentence)

</details>

<details>
<summary><strong>Ask your child</strong></summary>

**Question:** ... (a curiosity question about this specific step)
**Expected answer:** ...

</details>

<details>
<summary><strong>Common mistake</strong></summary>

**Mistake:** ...
**Avoid it:** ... (supportive, no blame)

</details>

Then add:
**Tiny check:** ... (one fast check that the child got this step)
**If you see this mistake:** ... (one calm correction)
**Fix question:** "..." (a gentle retry question)

**🏠 Do this together at home**
Goal is a real physical activity using objects already in the home that connects to the homework concept.
This must involve touching, moving, or arranging real objects together.
Never suggest drawing or writing as the demonstration. That is just doing math with a pencil.
Never force a connection. If no natural household activity exists for this topic, use the fallback.

If a real physical activity exists:
**Items:** ... (objects already in most homes, no special materials)
**Do this together:** (max 3 short action lines, each starting with a verb)
**Say this while doing it:** "..." (warm, one sentence, collaborative)
**Link back to the homework question:** ... (one sentence connecting the activity to the specific question)

If no natural physical activity exists:
**Why a household demo does not fit here:** ... (one honest sentence)
**Instead, try this visual:** ... (describe a simple sketch or finger pointing activity, max 2 lines)
**Ask your child:** "..." (one curiosity question)

**🧩 Extra practice**
The homework question your child brought is the main question to solve together.
Only use these if your child solves it and wants to keep going.

Give exactly 2 similar questions.

For each:
Question line, then one details block:

<details>
<summary><strong>Answer</strong></summary>

**Answer:** ...
**Why:** ...
**Quick check:** ...
**Common mistake:** ...
**What to ask next:** "..." (relationship friendly follow up)

</details>

**🧑‍🏫 If things get hard**
This section must feel human, not scripted.
It must respond to the emotional moment implied by the parent message and the specific homework topic.

Rules:
1) Never repeat the same lines across answers. Vary phrasing.
2) Do not sound like a therapist. Sound like a calm helpful parent mentor.
3) Refer to THIS specific homework question in simple words.
4) Use gentle emotional connection. Name the feeling without drama.
5) Give options. Parents need choices, not one script.
6) Keep each block short. No long speeches.

Write exactly these four details blocks in this order.
Each block must include:
- One short empathy line specific to this moment
- Two different things the parent can say (Option A and Option B)
- One tiny next action that takes under 20 seconds

<details>
<summary><strong>Stuck?</strong></summary>

One empathy line that matches the moment.

Option A: "..."
Option B: "..."

Tiny next action: ...

</details>

<details>
<summary><strong>Rushing?</strong></summary>

One empathy line that matches the moment.

Option A: "..."
Option B: "..."

Tiny next action: ...

</details>

<details>
<summary><strong>Frustrated?</strong></summary>

One empathy line that matches the moment.

Option A: "..."
Option B: "..."

Tiny next action: ...

</details>

<details>
<summary><strong>Confident?</strong></summary>

One empathy line that matches the moment.

Option A: "..."
Option B: "..."

Tiny next action: ...

</details>

Then add exactly these two lines:

**Break trigger:** ... (a simple signal like "if voices get sharper" or "if the child goes quiet")
**Remember:** ... (one line that makes the parent feel capable and connected)
`.trim();

/* =========================================================================
   OpenAI client
   ========================================================================= */
function getClient(): OpenAI {
  const k = process.env.OPENAI_API_KEY;
  if (!k) throw new Error("Missing OPENAI_API_KEY");
  return new OpenAI({ apiKey: k });
}

/* =========================================================================
   Build messages
   ========================================================================= */
function mapToOpenAIContent(content?: string, parts?: Part[]) {
  if (parts && parts.length) {
    return parts.map((p) =>
      p.type === "text"
        ? ({ type: "text", text: p.text } as any)
        : ({ type: "image_url", image_url: { url: p.image_url } } as any)
    );
  }
  return [{ type: "text", text: content ?? "" }];
}

function buildMessages(opts: {
  history: ChatMessage[];
  keep?: number;
  inferredTopic?: string;
  problemText?: string;
}) {
  const { history, keep = 6, inferredTopic, problemText } = opts;
  const recent = history.filter((m) => m.role !== "system").slice(-Math.max(2, Math.min(keep, 12)));

  const msgs: any[] = [
    { role: "system" as const, content: SYSTEM_PROMPT },
    ...recent.map((m) => ({ role: m.role, content: mapToOpenAIContent(m.content, m.contentParts) })),
  ];

  if (inferredTopic) {
    msgs.splice(1, 0, {
      role: "user",
      content: [{ type: "text", text: `If the parent misspelled the term, interpret it as: ${inferredTopic}. Continue without asking for confirmation.` }],
    });
  }

  if (problemText) {
    msgs.splice(1, 0, {
      role: "user",
      content: [{ type: "text", text: `The parent is asking about this specific homework question: "${problemText}". Teach the parent how to explain and guide their child through this exact question step by step.` }],
    });
  }

  return msgs;
}

/* =========================================================================
   SSE helpers
   ========================================================================= */
const sseHeaders = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
};

const enc = new TextEncoder();
const send = (controller: ReadableStreamDefaultController, payload: any) =>
  controller.enqueue(enc.encode(`data: ${JSON.stringify(payload)}\n\n`));

/* =========================================================================
   Handler
   ========================================================================= */
const DEFAULT_MAX_TOKENS = 2400;

export async function POST(req: Request) {
  try {
    const supabase = await getServerSupabase();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as ChatRequest;
    const { model, temperature, max_tokens, keep } = body || {};
    const messages = sanitizeIncomingMessages(body?.messages || []);

    if (!messages?.length) {
      return NextResponse.json({ error: "No messages provided." }, { status: 400 });
    }

    const lastUserMsg = messages.slice().reverse().find((m) => m.role === "user");
    const lastUserText = extractText(lastUserMsg);

    const stream = new ReadableStream({
      async start(controller) {
        try {
          if (GREETINGS_ONE_LINERS.length && GREETING_RX.test(lastUserText)) {
            send(controller, { type: "token", t: pick(GREETINGS_ONE_LINERS) });
            send(controller, { type: "done" });
            controller.close();
            return;
          }

          if (THANKS_ONE_LINERS.length && THANKS_RX.test(lastUserText)) {
            send(controller, { type: "token", t: pick(THANKS_ONE_LINERS) });
            send(controller, { type: "done" });
            controller.close();
            return;
          }

          const mathCheck = looksMathy(lastUserText);

          if (!mathCheck.ok && looksClearlyNonMath(lastUserText)) {
            send(controller, { type: "token", t: pick(NON_MATH_ONE_LINERS) });
            send(controller, { type: "done" });
            controller.close();
            return;
          }

          const client = getClient();
          let extracted: QuestionExtractResponse | null = null;
          const hasImageInLast = !!lastUserMsg?.contentParts?.some((p) => p.type === "image_url");

          if (hasImageInLast && lastUserMsg?.contentParts?.length) {
            extracted = await extractQuestionsFromImages(client, lastUserMsg.contentParts);
            if (extracted?.questions?.length) {
              send(controller, { type: "questions", questions: extracted.questions });
            }
          }

          let problemText: string | undefined;

          if (extracted?.questions?.length) {
            const sel = parseSelectionIndex(lastUserText);
            if (sel && sel >= 1 && sel <= extracted.questions.length) {
              problemText = extracted.questions[sel - 1]?.text;
            } else if (extracted.questions.length === 1) {
              problemText = extracted.questions[0]?.text;
            } else {
              send(controller, { type: "token", t: formatQuestionListForUser(extracted.questions) });
              send(controller, { type: "done" });
              controller.close();
              return;
            }
          }

          if (!problemText) {
            const sel = parseSelectionIndex(lastUserText);
            if (sel) {
              const saved = findSavedExtractedQuestions(messages);
              if (saved?.length && sel >= 1 && sel <= saved.length) {
                problemText = saved[sel - 1]?.text;
              } else if (saved?.length) {
                send(controller, { type: "token", t: `I have ${saved.length} saved questions. Send a number from 1 to ${saved.length}.` });
                send(controller, { type: "done" });
                controller.close();
                return;
              }
            }
          }

          if (!problemText) {
            problemText = isProblemLike(lastUserText) ? lastUserText : undefined;
          }

          const payload = buildMessages({
            history: messages,
            keep: Math.max(2, Math.min(keep ?? 6, 12)),
            inferredTopic: mathCheck.bestGuess,
            problemText,
          });

          const maxOut = Math.max(700, Math.min(max_tokens ?? DEFAULT_MAX_TOKENS, 8000));

          const completionStream = await client.chat.completions.create({
            model: model || "gpt-4o-mini",
            temperature: temperature ?? 0.3,
            max_tokens: maxOut,
            stream: true,
            messages: payload as any,
          });

          for await (const chunk of completionStream as any) {
            const delta = chunk?.choices?.[0]?.delta?.content || "";
            if (!delta) continue;
            const safeDelta = stripMarkerFromText(String(delta)).replace(/\u2014|\u2013/g, " ");
            if (safeDelta) send(controller, { type: "token", t: safeDelta });
          }

          send(controller, { type: "done" });
          controller.close();
        } catch (err: any) {
          console.error("/api/chat error:", err);
          send(controller, { type: "token", t: "\n\n⚠️ Error. Please try again." });
          send(controller, { type: "done" });
          controller.close();
        }
      },
    });

    return new Response(stream, { headers: sseHeaders });
  } catch (err: any) {
    console.error("/api/chat error:", err);
    return NextResponse.json({ error: err?.message || "Unknown error" }, { status: 500 });
  }
}