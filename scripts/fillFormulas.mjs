// scripts/fillFormulas.mjs
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
if (!url || !key) throw new Error("Missing env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
const db = createClient(url, key, { auth: { persistSession: false } });

/** Topic map: title keywords -> formulas with inline symbol meanings */
const TOPIC_FORMULAS = [
  {
    match: ["area of rectangle","area rectangle","rectangle area"],
    items: [
      { f: "$$A = l \\times w$$", explain: ["$A$ = area","$l$ = length","$w$ = width"] }
    ]
  },
  {
    match: ["perimeter","perimeter of","polygon perimeter"],
    items: [
      { f: "$$P = \\text{sum of all side lengths}$$", explain: ["$P$ = perimeter (distance around)"] }
    ]
  },
  {
    match: ["area of triangle","triangle area"],
    items: [
      { f: "$$A = \\tfrac12 b h$$", explain: ["$A$ = area","$b$ = base","$h$ = height (perpendicular)"] }
    ]
  },
  {
    match: ["volume of rectangular prism","volume rectangular prism","rectangular prism volume"],
    items: [
      { f: "$$V = l \\times w \\times h$$", explain: ["$V$ = volume","$l,w,h$ = dimensions"] }
    ]
  },
  {
    match: ["surface area of rectangular prism","surface area prism"],
    items: [
      { f: "$$SA = 2(lw + lh + wh)$$", explain: ["$SA$ = surface area","$l,w,h$ = dimensions"] }
    ]
  },
  {
    match: ["circle area","area of circle"],
    items: [
      { f: "$$A = \\pi r^2$$", explain: ["$A$ = area","$\\pi \\approx 3.14159$","$r$ = radius"] }
    ]
  },
  {
    match: ["circumference","circle circumference","perimeter of circle"],
    items: [
      { f: "$$C = 2\\pi r = \\pi d$$", explain: ["$C$ = circumference","$r$ = radius","$d=2r$ = diameter"] }
    ]
  },
  {
    match: ["add fractions","fraction addition","adding fractions"],
    items: [
      { f: "Common denom: $$\\tfrac{a}{m}+\\tfrac{b}{m}=\\tfrac{a+b}{m}$$", explain: ["$a,b$ numerators","$m$ denominator"] },
      { f: "Different denom: $$\\tfrac{a}{m}+\\tfrac{b}{n}=\\tfrac{an+bm}{mn}$$", explain: ["Find common denominator first"] }
    ]
  },
  {
    match: ["subtract fractions","fraction subtraction","subtracting fractions"],
    items: [
      { f: "Common denom: $$\\tfrac{a}{m}-\\tfrac{b}{m}=\\tfrac{a-b}{m}$$", explain: ["$a,b$ numerators","$m$ denominator"] },
      { f: "Different denom: $$\\tfrac{a}{m}-\\tfrac{b}{n}=\\tfrac{an-bm}{mn}$$", explain: ["Use common denominator; simplify"] }
    ]
  },
  {
    match: ["multiply fractions","fraction multiplication"],
    items: [
      { f: "$$\\tfrac{a}{b}\\times\\tfrac{c}{d}=\\tfrac{ac}{bd}$$", explain: ["Multiply tops; multiply bottoms; simplify"] }
    ]
  },
  {
    match: ["divide fractions","fraction division"],
    items: [
      { f: "$$\\tfrac{a}{b}\\div\\tfrac{c}{d}=\\tfrac{ad}{bc}$$", explain: ["Keep, Change, Flip (KCF)"] }
    ]
  },
  {
    match: ["percent","percentage"],
    items: [
      { f: "$$\\text{percent}=\\tfrac{\\text{part}}{\\text{whole}}\\times100\\%$$", explain: ["Percent means per 100"] },
      { f: "$$\\text{part}=\\text{percent}\\times\\text{whole}$$", explain: ["Convert 15\\% to 0.15 for calc"] }
    ]
  },
  {
    match: ["slope","rate of change"],
    items: [
      { f: "$$m=\\frac{\\Delta y}{\\Delta x}=\\frac{y_2-y_1}{x_2-x_1}$$", explain: ["$m$ = slope (rise/run)"] },
      { f: "$$y=mx+b$$", explain: ["$b$ = y-intercept"] }
    ]
  },
  {
    match: ["linear equation","slope intercept","graph lines"],
    items: [
      { f: "$$y=mx+b$$", explain: ["$m$ slope","$b$ y-intercept"] }
    ]
  },
  {
    match: ["pythagorean","pythagoras"],
    items: [
      { f: "$$a^2+b^2=c^2$$", explain: ["$a,b$ legs","$c$ hypotenuse"] }
    ]
  },
  {
    match: ["exponent rules","laws of exponents"],
    items: [
      { f: "$$a^ma^n=a^{m+n}$$", explain: [] },
      { f: "$$\\frac{a^m}{a^n}=a^{m-n}$$", explain: [] },
      { f: "$$(a^m)^n=a^{mn}$$", explain: [] },
      { f: "$$a^{-n}=\\tfrac1{a^n}\\;(a\\ne0)$$", explain: ["$a$ base; $m,n$ integers"] }
    ]
  },
  {
    match: ["scientific notation"],
    items: [
      { f: "$$a\\times10^n\\;(1\\le a<10)$$", explain: ["$a$ significand","$n$ power of ten"] }
    ]
  },
  {
    match: ["quadratic formula","solve quadratic","roots of quadratic"],
    items: [
      { f: "$$x=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}$$", explain: ["$a,b,c$ from $ax^2+bx+c=0$","$\\pm$ = plus or minus"] }
    ]
  },
  {
    match: ["vertex form","quadratic vertex"],
    items: [
      { f: "$$y=a(x-h)^2+k$$", explain: ["$(h,k)$ vertex","$a$ opens up/down & width"] }
    ]
  }
];

function titleMatches(title, keywords) {
  const t = (title || "").toLowerCase();
  return keywords.some(k => t.includes(k.toLowerCase()));
}

function buildFormulasMarkdown(items) {
  // One block: each formula followed by its symbol meanings
  return items.map(({ f, explain }) => {
    const lines = ["- " + f];
    if (explain && explain.length) {
      for (const e of explain) lines.push("  - " + e);
    }
    return lines.join("\n");
  }).join("\n");
}

const isPlaceholder = (s="") =>
  !s.trim() ||
  /^>\s*If this topic uses formulas/i.test(s) ||
  /^\*\*Key formula/i.test(s) ||
  /^_\(/i.test(s);

async function upsertFormulas(lesson_id, md) {
  const { data: existing } = await db
    .from("lesson_sections")
    .select("id, markdown_content")
    .eq("lesson_id", lesson_id)
    .eq("section_key", "formulas")
    .maybeSingle();

  if (!md || !md.trim()) {
    // If empty or placeholder—delete section if it exists
    if (existing?.id && isPlaceholder(existing.markdown_content || "")) {
      await db.from("lesson_sections").delete().eq("id", existing.id);
    }
    return;
  }

  if (existing?.id) {
    await db.from("lesson_sections").update({ markdown_content: md, order_index: 6 }).eq("id", existing.id);
  } else {
    await db.from("lesson_sections").insert({
      lesson_id,
      section_key: "formulas",
      order_index: 6,
      markdown_content: md
    });
  }
}

async function run() {
  console.log("Filling/cleaning formulas (no separate glossary) …");
  const { data: lessons, error } = await db.from("lessons").select("id, title");
  if (error) throw error;

  let updated = 0, removed = 0, merged = 0;

  for (const L of lessons || []) {
    // choose topic
    const topic = TOPIC_FORMULAS.find(t => titleMatches(L.title, t.match));
    const md = topic ? buildFormulasMarkdown(topic.items) : "";

    // Write (or remove) formulas
    const before = await db
      .from("lesson_sections")
      .select("id, markdown_content")
      .eq("lesson_id", L.id)
      .eq("section_key", "formulas")
      .maybeSingle();

    await upsertFormulas(L.id, md);
    if (topic) {
      updated++;
    } else if (before?.data?.id && isPlaceholder(before.data.markdown_content || "")) {
      removed++;
    }

    // If a legacy formula_glossary exists, delete it (since symbols are inline now)
    const { data: fg } = await db
      .from("lesson_sections")
      .select("id")
      .eq("lesson_id", L.id)
      .eq("section_key", "formula_glossary")
      .maybeSingle();
    if (fg?.id) {
      await db.from("lesson_sections").delete().eq("id", fg.id);
      merged++;
    }
  }

  console.log(`✅ Done. Updated: ${updated}, Removed placeholders: ${removed}, Deleted legacy glossaries: ${merged}`);
}

run().catch(e => { console.error(e); process.exit(1); });
