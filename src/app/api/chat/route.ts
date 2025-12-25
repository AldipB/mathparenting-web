// src/app/api/chat/route.ts
export const runtime = "edge";

import { NextResponse } from "next/server";
import OpenAI from "openai";

/* =========================================================================
   Types
   ========================================================================= */
type ChatRole = "user" | "assistant" | "system";
type Part =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: string }; // data URL or https
type ChatMessage = { role: ChatRole; content?: string; contentParts?: Part[] };
type ChatRequest = {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
  keep?: number; // number of recent (non-system) turns to retain
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
const pick = <T,>(arr: readonly T[]) =>
  arr[Math.floor(Math.random() * arr.length)];

const GREETING_RX =
  /^(hi|hii+|hello+|hey+|hiya|howdy|hola|namaste|yo|sup|good (morning|afternoon|evening|night))\b/i;

const GREETINGS_ONE_LINERS = [
  "Hello. Tell me a K–12 math topic or question and I will help you teach it at home.",
  "Hi. What math topic are you working on with your child today.",
  "Namaste. Share a K–12 math question and I will guide you step by step.",
] as const;

const NON_MATH_ONE_LINERS = [
  "I am mainly for K–12 math and how you teach it. If you tell me a math topic, I will help you step by step.",
  "I focus on K–12 math and parent guidance. Share a math question and I will guide you.",
] as const;

const normalize = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

/* Extract plain text from a message (supports contentParts) */
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
  const m = a.length,
    n = b.length;
  if (!m) return n;
  if (!n) return m;
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

  return null;
}

function formatQuestionListForUser(qs: ExtractedQuestion[]) {
  const lines: string[] = [];
  lines.push("I can see multiple questions in your photo.");
  lines.push('Tell me which one to solve, like: "solve question 2".');
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

async function extractQuestionsFromImages(
  client: OpenAI,
  parts: Part[]
): Promise<QuestionExtractResponse | null> {
  const imageParts = (parts || []).filter((p) => p.type === "image_url");
  if (!imageParts.length) return null;

  const extractionPrompt =
    "Extract all distinct math questions from this image.\n" +
    "Return JSON only using this schema:\n" +
    '{"questions":[{"id":"Q1","label":"2","text":"exact question text","subparts":["a) ...","b) ..."],"confidence":0.0}]}\n' +
    "Rules:\n" +
    "Keep text close to the image\n" +
    "Split multiple questions\n" +
    "Preserve visible numbering in label if present\n" +
    "Include uncertain items with lower confidence\n";

  const content: any[] = [
    { type: "text", text: extractionPrompt },
    ...imageParts.map((p) => ({
      type: "image_url",
      image_url: { url: p.image_url },
    })),
  ];

  const resp = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    max_tokens: 900,
    messages: [
      {
        role: "system",
        content: "You extract questions accurately. Output must be valid JSON only.",
      },
      { role: "user", content },
    ],
    response_format: { type: "json_object" } as any,
  });

  const raw = resp.choices?.[0]?.message?.content || "";

  try {
    const parsed = JSON.parse(raw) as QuestionExtractResponse;
    if (parsed?.questions?.length) return parsed;
  } catch {}

  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      const parsed = JSON.parse(raw.slice(start, end + 1)) as QuestionExtractResponse;
      if (parsed?.questions?.length) return parsed;
    } catch {}
  }

  return null;
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
        if (p.type === "text") {
          return { ...p, text: stripMarkerFromText(p.text) };
        }
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

// Expanded lexicon: broad subjects + detailed K–12 topics + common misspellings
const TOPIC_BUCKETS = [
  // broad subjects
  "math",
  "arithmetic",
  "algebra",
  "prealgebra",
  "geometry",
  "trigonometry",
  "precalculus",
  "calculus",
  "statistics",
  "probability",
  "number theory",
  "linear algebra",
  "discrete math",
  "set theory",
  "logic",

  // arithmetic / number sense
  "counting",
  "place value",
  "whole numbers",
  "natural numbers",
  "integers",
  "even",
  "odd",
  "addition",
  "subtraction",
  "multiplication",
  "division",
  "long division",
  "factors",
  "multiples",
  "prime",
  "composite",
  "lcm",
  "hcf",
  "gcd",
  "number line",
  "rounding",
  "estimation",
  "order of operations",
  "pemdas",
  "bodmas",
  "powers",
  "indices",
  "exponents",
  "roots",
  "square root",
  "cube root",
  "surds",

  // fractions / decimals / percent / ratio
  "fraction",
  "fractions",
  "mixed number",
  "improper fraction",
  "equivalent fractions",
  "simplify fractions",
  "decimal",
  "percent",
  "percents",
  "ratio",
  "rate",
  "proportion",
  "unit rate",

  // measurement / geometry
  "units",
  "unit conversion",
  "metric",
  "imperial",
  "time",
  "elapsed time",
  "money",
  "temperature",
  "perimeter",
  "area",
  "surface area",
  "volume",
  "nets",
  "angle",
  "acute",
  "obtuse",
  "right angle",
  "triangle",
  "isosceles",
  "equilateral",
  "scalene",
  "quadrilateral",
  "rectangle",
  "square",
  "parallelogram",
  "rhombus",
  "trapezoid",
  "polygon",
  "regular polygon",
  "circle",
  "radius",
  "diameter",
  "circumference",
  "arc length",
  "sector area",
  "pythagorean",
  "similarity",
  "congruence",
  "transformations",
  "reflection",
  "rotation",
  "translation",
  "dilation",
  "scale factor",
  "coordinates",
  "cartesian plane",
  "distance formula",
  "midpoint",

  // algebra
  "variable",
  "expression",
  "equation",
  "inequality",
  "absolute value",
  "evaluate",
  "simplify",
  "linear expression",
  "linear equation",
  "slope",
  "intercept",
  "slope intercept",
  "point slope",
  "graphing lines",
  "system of equations",
  "substitution",
  "elimination",
  "quadratic",
  "factoring",
  "expand",
  "complete the square",
  "quadratic formula",
  "discriminant",
  "polynomial",
  "degree",
  "remainder theorem",
  "binomial theorem",
  "function",
  "functions",
  "domain",
  "range",
  "composition",
  "inverse function",
  "piecewise",
  "interval notation",

  // graphs / data
  "graph",
  "graphs",
  "scatter plot",
  "histogram",
  "box plot",
  "line graph",
  "bar graph",
  "pie chart",
  "dot plot",
  "two-way table",
  "frequency table",
  "best fit line",
  "correlation",
  "residual",

  // probability & statistics
  "mean",
  "median",
  "mode",
  "range",
  "quartiles",
  "iqr",
  "standard deviation",
  "variance",
  "experiment",
  "sample space",
  "outcomes",
  "permutations",
  "combinations",
  "factorial",
  "binomial",
  "normal distribution",
  "z score",

  // trig
  "trigonometry",
  "unit circle",
  "radians",
  "degrees",
  "sine",
  "cosine",
  "tangent",
  "secant",
  "cosecant",
  "cotangent",
  "right triangle trigonometry",
  "special right triangles",
  "trig identities",
  "law of sines",
  "law of cosines",

  // precalc & calculus (HS intro)
  "sequences",
  "series",
  "arithmetic sequence",
  "geometric sequence",
  "sigma notation",
  "limits",
  "limit",
  "derivative",
  "derivatives",
  "differentiation",
  "chain rule",
  "product rule",
  "quotient rule",
  "critical points",
  "optimization",
  "integral",
  "integrals",
  "integration",
  "area under curve",
  "riemann sum",

  // vectors & matrices
  "vector",
  "vectors",
  "magnitude",
  "direction",
  "dot product",
  "cross product",
  "matrix",
  "matrices",
  "determinant",
  "inverse matrix",
  "gaussian elimination",

  // sets & logic
  "set",
  "sets",
  "union",
  "intersection",
  "complement",
  "venn diagram",
  "truth table",
  "implication",
  "contrapositive",

  // parent finance math
  "simple interest",
  "compound interest",
  "interest rate",
  "mortgage",
  "loan payment",
  "amortization",
  "budget",
  "tax",
  "sales tax",
  "discount",
  "tip",
  "markup",
  "depreciation",
  "break even",
  "unit price",

  // physics-y quantities often asked in math contexts
  "velocity",
  "speed",
  "acceleration",
  "distance",
  "displacement",
  "slope from data",

  // common misspellings
  "differantation",
  "fracton",
  "devishon",
  "substraction",
  "aljebra",
  "algabra",
  "multiplcation",
  "percentsge",
  "equasion",
];

function looksClearlyNonMath(t: string) {
  const n = normalize(t);
  const banned = [
    "politic",
    "election",
    "president",
    "prime minister",
    "war",
    "religion",
    "god",
    "gender",
    "celebrity",
    "gossip",
    "movie",
    "song",
    "recipe",
    "travel visa",
    "immigration",
    "diagnosis",
    "medical advice",
    "backend",
    "api key",
    "openai",
    "prompt",
    "system prompt",
    "source code",
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
      const d = Math.min(
        levenshtein(tok, key),
        levenshtein(tok, normalize(topic))
      );
      const pass =
        (tok.length <= 5 && d <= 1) ||
        (tok.length <= 8 && d <= 2) ||
        d <= 3;
      if (pass) {
        if (!best || d < best.d) best = { d, topic };
      }
    }
  }
  if (best) return { ok: true, bestGuess: best.topic };
  return { ok: false };
}

/* A lightweight "does this look like a concrete problem/question" check */
const PROBLEM_RX =
  /(solve|simplify|evaluate|find|compute|factor|expand|differentiate|derive|integrate|derivative|integral|roots?|zeros?|intercepts?|prove|show)\b|[=±√^*/()]/i;

function isProblemLike(text: string) {
  const t = text.trim();
  if (!t) return false;
  if (t.endsWith("?")) return true;
  return PROBLEM_RX.test(t);
}

/* =========================================================================
   System prompt: Parent first, proper KaTeX, hidden answers (ORIGINAL)
   ========================================================================= */
const SYSTEM_PROMPT = `
You are MathParenting, a warm helper for PARENTS teaching K–12 MATH ONLY.

VOICE AND SCOPE
- Talk to the PARENT, not the student or child.
- Use short sentences, friendly tone, and zero jargon.
- Always address the parent directly: "you can say...", "ask your child...", "show your child...".
- Never talk as if you are speaking to the child.
- Stay strictly in math topics (K–12 and simple everyday finance math), plus closely related follow-up questions about learning, confidence, or study habits.
- If the message is clearly non-math and not about learning or study habits, gently steer back to math in one short sentence.
- If the parent misspells a term, infer it and continue without asking for confirmation.

AGE AND GRADE AWARENESS
- If the parent mentions the child’s age or grade, for example: "my 8 year old", "grade 3", "6th grader":
  - Adjust examples, language, and numbers to match that level.
  - For younger children, favor concrete objects (snacks, toys, simple counting).
  - For older children, you can use more symbolic notation, equations, and word problems.
- If the parent does NOT mention age or grade:
  - Give a strong but general explanation that would work for a typical child at that topic level.
  - You may briefly suggest how to simplify for younger children or extend for older ones.

FORMULAS AND NOTATION
- Only introduce a formula when it genuinely helps the parent teach or answer the question.
- When you use a formula:
  - Put it on its own line in display math using KaTeX, for example: $$ A = \\pi r^2 $$.
  - For derivatives, use proper fraction notation, for example: $$ \\frac{dy}{dx} = 2x $$.
  - For division, use fractions with \\frac or \\dfrac whenever it improves clarity.
  - For matrices, use proper LaTeX such as $$ \\begin{bmatrix} 1 & 2 \\\\ 3 & 4 \\end{bmatrix} $$.
  - Immediately after a key formula, clearly explain each symbol in plain language in the context of this question.
    - For example: "A is the area", "r is the radius", "t is the time in years", "P is the starting amount".
- In the explanation sentences, keep symbols as plain text (A, r, t, P, dy/dx) without $ symbols around them.
- Connect every symbol back to the actual numbers in the parent’s problem.

TOPIC INTRO BEFORE HEADINGS
- Before you output any heading, first write 1–2 sentences that introduce the topic in plain language for the parent.
  - For example: "This question is about the angle of elevation and how to find a height." or "This is about basic differentiation of powers of x."
- After those 1–2 sentences, leave a blank line, then start the sections.

ABSOLUTE OUTPUT FORMAT — USE THESE EXACT HEADINGS AND ORDER:

🧠 Core Idea
- 2–3 short sentences for parents.
- Define the concept simply, say why it matters, and where it shows up in real life.
- If a formula is central, include a display formula here with a short symbol explanation immediately after.

🏠 Household Demonstration
- One quick at-home activity using common items (money, food, toys, clocks, chores, time).
- Tell the parent exactly what to show and what to say.

👨‍👩‍👧 Step-by-Step Teaching Guide
- Use as many numbered steps as needed (do not stop at 5 if more are needed).
- Each step tells the parent what to do or say to their child.
- If the parent asked a specific solvable question:
  - Begin this section with a complete worked solution for that exact problem.
  - Show each math step the parent can walk through.
  - Use display KaTeX for key lines, for example:
    - $$ y = 3x^2 $$
    - $$ \\frac{dy}{dx} = 6x $$
  - Keep the explanation readable aloud.

🧩 Practice Together
- Give 2–4 short practice items with simple numbers, chosen to match the child’s level if given (or general otherwise).
- For each item that has a clear answer:

  1. First write the question or task the parent asks the child on its own line, for example:
     Ask your child: "What is 2 + 3?"

  2. Then add a completely blank line.

  3. On the next new line, write the <details> tag by itself with no other text on that line:
     <details>

  4. On the next new line, write the summary line, also by itself:
     <summary>Answer</summary>

  5. On the following line(s), write the explanation and any KaTeX, for example:
     $$ D + E = \\begin{bmatrix} 3 & 4 \\\\ 6 & 7 \\end{bmatrix} $$
     Then add one short sentence explaining how you would walk through it with the child.

  6. Finally, on a new line by itself, close the block:
     </details>

- Never put the <details> tag on the same line as any other text.
- Never put the <summary>Answer</summary> on the same line as any other text.
- The pattern must always be:
  question line,
  blank line,
  <details> on its own line,
  <summary>Answer</summary> on its own line,
  answer content on one or more following lines,
  </details> on its own line.

- The answer content must always be inside <details> and <summary> so that it stays hidden until the parent clicks.

💬 Parent Tip
- 1–2 sentences of encouragement or a quick teaching tip for parents.
- Normalize confusion and remind them that going slowly and repeating examples is okay.
- Never blame the parent or the child. Always stay supportive.

IMPORTANT STYLE RULES
- Do NOT use the em dash character or en dash. Avoid "—" and "–". Use a simple hyphen "-" or a colon ":" instead.
- Keep bullets and numbering tidy. No extra sections, no prefaces other than the 1–2 sentence topic intro, and no afterwords.
- Always speak directly to the parent.
- If a simple graph would help, you may include ONE small \`graph\` fenced block with JSON. All text remains outside that block.
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
   Build messages (support contentParts; inject topic/solution hints)
   ========================================================================= */
function mapToOpenAIContent(content?: string, parts?: Part[]) {
  if (parts && parts.length) {
    return parts.map((p) =>
      p.type === "text"
        ? ({ type: "text", text: p.text } as any)
        : ({
            type: "image_url",
            image_url: { url: p.image_url }, // data: URL or https://
          } as any)
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
  const recent = history
    .filter((m) => m.role !== "system")
    .slice(-Math.max(2, Math.min(keep, 12)));

  const msgs: any[] = [
    { role: "system" as const, content: SYSTEM_PROMPT },
    ...recent.map((m) => ({
      role: m.role,
      content: mapToOpenAIContent(m.content, m.contentParts),
    })),
  ];

  if (inferredTopic) {
    msgs.splice(1, 0, {
      role: "user",
      content: [
        {
          type: "text",
          text: `If the parent misspelled the term, interpret it as: ${inferredTopic}. Continue without asking for confirmation and follow the required 5-section format and topic intro exactly.`,
        },
      ],
    });
  }
  if (problemText) {
    msgs.splice(1, 0, {
      role: "user",
      content: [
        {
          type: "text",
          text:
            `The parent asked a specific problem: "${problemText}". ` +
            `In the "👨‍👩‍👧 Step-by-Step Teaching Guide" section, begin with a complete worked solution for this exact problem, with display KaTeX for key steps, then give general teaching guidance.`,
        },
      ],
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
   Handler — STREAMING
   ========================================================================= */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as ChatRequest;
    const { model, temperature, max_tokens, keep } = body || {};

    // FIX: prevent leaked marker content from being re-sent to the model or UI
    const messages = sanitizeIncomingMessages(body?.messages || []);

    if (!messages?.length) {
      return NextResponse.json(
        { error: "No messages provided." },
        { status: 400 }
      );
    }

    // Find last user message (may include contentParts)
    const lastUserMsg = messages
      .slice()
      .reverse()
      .find((m) => m.role === "user");
    const lastUserText = extractText(lastUserMsg);

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Quick greeting path
          if (GREETINGS_ONE_LINERS.length && GREETING_RX.test(lastUserText)) {
            send(controller, { type: "token", t: pick(GREETINGS_ONE_LINERS) });
            send(controller, { type: "done" });
            controller.close();
            return;
          }

          // If clearly non-math, nudge back and end
          const mathCheck = looksMathy(lastUserText);
          if (!mathCheck.ok && looksClearlyNonMath(lastUserText)) {
            send(controller, {
              type: "token",
              t: pick(NON_MATH_ONE_LINERS),
            });
            send(controller, { type: "done" });
            controller.close();
            return;
          }

          const client = getClient();

          // Photo multi question extraction on last user photo
          let extracted: QuestionExtractResponse | null = null;
          const hasImageInLast =
            !!lastUserMsg?.contentParts?.some((p) => p.type === "image_url");

          if (hasImageInLast && lastUserMsg?.contentParts?.length) {
            extracted = await extractQuestionsFromImages(
              client,
              lastUserMsg.contentParts
            );
            if (extracted?.questions?.length) {
              // IMPORTANT: only send as "questions" event, never as visible token
              send(controller, { type: "questions", questions: extracted.questions });
            }
          }

          // Decide which exact problem to solve
          let problemText: string | undefined;

          // If we just extracted and there are multiple questions
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

          // If user says solve question 2 without reupload, use saved marker from history (optional)
          if (!problemText) {
            const sel = parseSelectionIndex(lastUserText);
            if (sel) {
              const saved = findSavedExtractedQuestions(messages);
              if (saved?.length && sel >= 1 && sel <= saved.length) {
                problemText = saved[sel - 1]?.text;
              } else if (saved?.length) {
                send(controller, {
                  type: "token",
                  t: `I have ${saved.length} questions saved from your last photo. Please say a number from 1 to ${saved.length}.`,
                });
                send(controller, { type: "done" });
                controller.close();
                return;
              }
            }
          }

          // Problem-like. Ask the model to include a full worked solution first.
          if (!problemText) {
            problemText = isProblemLike(lastUserText) ? lastUserText : undefined;
          }

          const payload = buildMessages({
            history: messages,
            keep: Math.max(2, Math.min(keep ?? 6, 12)),
            inferredTopic: mathCheck.bestGuess,
            problemText,
          });

          const completion = await client.chat.completions.create({
            model: model || "gpt-4o-mini",
            temperature: temperature ?? 0.3,
            max_tokens: max_tokens ?? 1200,
            stream: true,
            messages: payload as any,
          });

          for await (const part of completion) {
            const chunk = part.choices?.[0]?.delta?.content || "";
            if (chunk) {
              // pass through as plain text; client does KaTeX rendering
              const safe = stripMarkerFromText(String(chunk)).replace(/\u2014|\u2013/g, "-");
              if (safe) send(controller, { type: "token", t: safe });
            }
          }

          send(controller, { type: "done" });
          controller.close();
        } catch (err: any) {
          console.error("/api/chat stream error:", err);
          send(controller, {
            type: "token",
            t: "\n\n⚠️ Stream error. Please try again.",
          });
          send(controller, { type: "done" });
          controller.close();
        }
      },
    });

    return new Response(stream, { headers: sseHeaders });
  } catch (err: any) {
    console.error("/api/chat error:", err);
    return NextResponse.json(
      { error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
