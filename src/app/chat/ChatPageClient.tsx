// src/app/chat/ChatPageClient.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import "katex/dist/katex.min.css";

/* ------------------------------------------------------------------ */
/* Types and storage                                                  */
/* ------------------------------------------------------------------ */

type Role = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: Role;
  content: string;
  ts: number;
  placeholder?: boolean;
};

type ChatSession = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
};

type ExtractedQuestion = {
  id: string;
  label?: string;
  text: string;
  subparts?: string[];
  confidence?: number;
};

const SESSIONS_KEY = "mp.sessions.v1";
const MKEY = (id: string) => `mp.messages.${id}.v1`;
const QKEY = (id: string) => `mp.qextract.${id}.v1`;

/* Monthly usage limits */
const USAGE_KEY = "mp.usage.v1";
const MONTHLY_MESSAGE_LIMIT = 500;
const MONTHLY_IMAGE_LIMIT = 100;

type Usage = {
  month: string; // YYYY-MM
  messagesSent: number;
  imagesSent: number;
};

const isClient = typeof window !== "undefined";

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const pretty = (t: number) => new Date(t).toLocaleString();

const loadSessions = (): ChatSession[] =>
  isClient ? JSON.parse(localStorage.getItem(SESSIONS_KEY) || "[]") : [];

const saveSessions = (s: ChatSession[]) => {
  if (isClient) localStorage.setItem(SESSIONS_KEY, JSON.stringify(s));
};

const loadMessages = (id: string): ChatMessage[] =>
  isClient ? JSON.parse(localStorage.getItem(MKEY(id)) || "[]") : [];

const saveMessages = (id: string, msgs: ChatMessage[]) => {
  if (isClient) localStorage.setItem(MKEY(id), JSON.stringify(msgs));
};

function loadExtracted(id: string): ExtractedQuestion[] {
  if (!isClient) return [];
  try {
    const raw = localStorage.getItem(QKEY(id));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.questions) ? parsed.questions : [];
  } catch {
    return [];
  }
}

function saveExtracted(id: string, questions: ExtractedQuestion[]) {
  if (!isClient) return;
  localStorage.setItem(QKEY(id), JSON.stringify({ questions }));
}

function clearExtracted(id: string) {
  if (!isClient) return;
  localStorage.removeItem(QKEY(id));
}

/* ------------------------------------------------------------------ */
/* Monthly usage helpers                                              */
/* ------------------------------------------------------------------ */

function monthKeyFromNow() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function loadUsage(): Usage {
  const currentMonth = monthKeyFromNow();
  if (!isClient) return { month: currentMonth, messagesSent: 0, imagesSent: 0 };

  try {
    const raw = localStorage.getItem(USAGE_KEY);
    if (!raw) return { month: currentMonth, messagesSent: 0, imagesSent: 0 };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { month: currentMonth, messagesSent: 0, imagesSent: 0 };

    if (parsed.month !== currentMonth) {
      const fresh: Usage = { month: currentMonth, messagesSent: 0, imagesSent: 0 };
      localStorage.setItem(USAGE_KEY, JSON.stringify(fresh));
      return fresh;
    }

    return {
      month: currentMonth,
      messagesSent: Number.isFinite(parsed.messagesSent) ? Number(parsed.messagesSent) : 0,
      imagesSent: Number.isFinite(parsed.imagesSent) ? Number(parsed.imagesSent) : 0,
    };
  } catch {
    return { month: currentMonth, messagesSent: 0, imagesSent: 0 };
  }
}

function saveUsage(u: Usage) {
  if (!isClient) return;
  localStorage.setItem(USAGE_KEY, JSON.stringify(u));
}

/* ------------------------------------------------------------------ */
/* Simple graph renderer                                              */
/* ------------------------------------------------------------------ */

type GraphSpec = {
  type?: "cartesian";
  xMin?: number;
  xMax?: number;
  yMin?: number;
  yMax?: number;
  grid?: boolean;
  ticks?: number;
  axis?: boolean;
  lines?: Array<{ m: number; b: number }>;
  segments?: Array<{ x1: number; y1: number; x2: number; y2: number }>;
  functions?: Array<{ expr: string; samples?: number }>;
  points?: Array<{ x: number; y: number; label?: string }>;
};

function safeEvalExpr(expr: string, x: number): number | null {
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function("x", "Math", `return (${expr});`);
    const v = fn(x, Math);
    return Number.isFinite(v) ? Number(v) : null;
  } catch {
    return null;
  }
}

function looksLikeGraphSpec(o: any): o is GraphSpec {
  if (!o || typeof o !== "object") return false;
  const hasBounds = ["xMin", "xMax", "yMin", "yMax"].some((k) => typeof o[k] === "number");
  const hasSeries =
    Array.isArray(o.lines) || Array.isArray(o.points) || Array.isArray(o.functions) || Array.isArray(o.segments);
  return hasBounds || hasSeries;
}

function parseJsonObject(raw: string): any | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}

function Graph({ spec }: { spec: GraphSpec }) {
  const cfg: Required<Pick<GraphSpec, "xMin" | "xMax" | "yMin" | "yMax">> & GraphSpec = {
    xMin: spec.xMin ?? -10,
    xMax: spec.xMax ?? 10,
    yMin: spec.yMin ?? -10,
    yMax: spec.yMax ?? 10,
    ...spec,
  };

  const W = 640;
  const H = 400;

  const xToSvg = (x: number) => ((x - cfg.xMin) / (cfg.xMax - cfg.xMin)) * W;
  const yToSvg = (y: number) => H - ((y - cfg.yMin) / (cfg.yMax - cfg.yMin)) * H;

  const tickN = Math.max(2, Math.min(20, cfg.ticks ?? 10));
  const xStep = (cfg.xMax - cfg.xMin) / tickN;
  const yStep = (cfg.yMax - cfg.yMin) / tickN;

  const functionPaths: string[] = [];
  if (cfg.functions?.length) {
    for (const f of cfg.functions) {
      const n = Math.max(50, Math.min(1000, f.samples ?? 300));
      const dx = (cfg.xMax - cfg.xMin) / (n - 1);
      let d = "";
      for (let i = 0; i < n; i++) {
        const x = cfg.xMin + i * dx;
        const y = safeEvalExpr(f.expr, x);
        if (y === null) {
          d += ` M ${xToSvg(x)} ${yToSvg(0)}`;
          continue;
        }
        d += `${i === 0 ? "M" : "L"} ${xToSvg(x)} ${yToSvg(y)} `;
      }
      functionPaths.push(d);
    }
  }

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto rounded-xl border border-gray-200 bg-white"
        role="img"
        aria-label="Graph"
      >
        {cfg.grid && (
          <>
            {Array.from({ length: tickN + 1 }, (_, i) => {
              const X = xToSvg(cfg.xMin + i * xStep);
              return <line key={"gv" + i} x1={X} y1={0} x2={X} y2={H} stroke="#eef2ff" strokeWidth={1} />;
            })}
            {Array.from({ length: tickN + 1 }, (_, i) => {
              const Y = yToSvg(cfg.yMin + i * yStep);
              return <line key={"gh" + i} x1={0} y1={Y} x2={W} y2={Y} stroke="#eef2ff" strokeWidth={1} />;
            })}
          </>
        )}

        {cfg.axis && (
          <>
            {cfg.xMin < 0 && cfg.xMax > 0 && (
              <line x1={xToSvg(0)} y1={0} x2={xToSvg(0)} y2={H} stroke="#6b7280" strokeWidth={1.5} />
            )}
            {cfg.yMin < 0 && cfg.yMax > 0 && (
              <line x1={0} y1={yToSvg(0)} x2={W} y2={yToSvg(0)} stroke="#6b7280" strokeWidth={1.5} />
            )}
          </>
        )}

        {cfg.lines?.map((ln, i) => {
          const x1 = cfg.xMin;
          const x2 = cfg.xMax;
          const y1 = ln.m * x1 + ln.b;
          const y2 = ln.m * x2 + ln.b;
          return (
            <line
              key={"ln" + i}
              x1={xToSvg(x1)}
              y1={yToSvg(y1)}
              x2={xToSvg(x2)}
              y2={yToSvg(y2)}
              stroke="#2563eb"
              strokeWidth={2}
            />
          );
        })}

        {cfg.segments?.map((s, i) => (
          <line
            key={"sg" + i}
            x1={xToSvg(s.x1)}
            y1={yToSvg(s.y1)}
            x2={xToSvg(s.x2)}
            y2={yToSvg(s.y2)}
            stroke="#0ea5e9"
            strokeWidth={2}
          />
        ))}

        {functionPaths.map((d, i) => (
          <path key={"fn" + i} d={d} fill="none" stroke="#10b981" strokeWidth={2} />
        ))}

        {cfg.points?.map((p, i) => (
          <g key={"pt" + i}>
            <circle cx={xToSvg(p.x)} cy={yToSvg(p.y)} r={4} fill="#ef4444" />
            {p.label && (
              <text x={xToSvg(p.x) + 6} y={yToSvg(p.y) - 6} fontSize={12} fill="#374151">
                {p.label}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Simple diagram renderer                                            */
/* ------------------------------------------------------------------ */

type DiagramPizza = {
  type: "pizza";
  slices: number;
  shaded: number;
  label?: string;
};

type DiagramGrid = {
  type: "grid";
  rows: number;
  cols: number;
  shaded: number;
  label?: string;
};

type DiagramNumberLine = {
  type: "numberLine";
  min: number;
  max: number;
  ticks?: number;
  marks?: Array<{ x: number; label?: string }>;
  label?: string;
};

type DiagramPictogram = {
  type: "pictogram";
  item: string;
  count: number;
  shaded?: number;
  label?: string;
};

type DiagramSpec = DiagramPizza | DiagramGrid | DiagramNumberLine | DiagramPictogram;

function looksLikeDiagramSpec(o: any): o is DiagramSpec {
  if (!o || typeof o !== "object") return false;
  if (o.type === "pizza") return typeof o.slices === "number" && typeof o.shaded === "number";
  if (o.type === "grid") return typeof o.rows === "number" && typeof o.cols === "number" && typeof o.shaded === "number";
  if (o.type === "numberLine") return typeof o.min === "number" && typeof o.max === "number";
  if (o.type === "pictogram") return typeof o.item === "string" && typeof o.count === "number";
  return false;
}

function clampInt(n: number, lo: number, hi: number) {
  const v = Math.floor(Number(n));
  if (!Number.isFinite(v)) return lo;
  return Math.max(lo, Math.min(hi, v));
}

function emojiForItem(raw: string): string {
  const s = String(raw || "").trim().toLowerCase();

  const map: Record<string, string> = {
    pizza: "🍕",
    slice: "🍕",
    pie: "🥧",
    apple: "🍎",
    apples: "🍎",
    orange: "🍊",
    oranges: "🍊",
    banana: "🍌",
    bananas: "🍌",
    grape: "🍇",
    grapes: "🍇",
    strawberry: "🍓",
    strawberries: "🍓",
    watermelon: "🍉",
    watermelons: "🍉",
    pear: "🍐",
    pears: "🍐",
    cherry: "🍒",
    cherries: "🍒",
    cookie: "🍪",
    cookies: "🍪",
    candy: "🍬",
    candies: "🍬",
    chocolate: "🍫",
    coin: "🪙",
    coins: "🪙",
    money: "🪙",
    cup: "🥤",
    cups: "🥤",
    bottle: "🧴",
    bottles: "🧴",
    book: "📘",
    books: "📘",
    pencil: "✏️",
    pencils: "✏️",
    ball: "⚽",
    balls: "⚽",
    toy: "🧸",
    toys: "🧸",
    star: "⭐",
    stars: "⭐",
    marble: "🔵",
    marbles: "🔵",
    button: "🔘",
    buttons: "🔘",
  };

  if (map[s]) return map[s];

  if (s.includes("coin")) return "🪙";
  if (s.includes("pizza")) return "🍕";
  if (s.includes("apple")) return "🍎";
  if (s.includes("orange")) return "🍊";
  if (s.includes("banana")) return "🍌";
  if (s.includes("grape")) return "🍇";
  if (s.includes("straw")) return "🍓";
  if (s.includes("watermelon")) return "🍉";
  if (s.includes("cookie")) return "🍪";
  if (s.includes("chocolate")) return "🍫";
  if (s.includes("cup")) return "🥤";
  if (s.includes("book")) return "📘";
  if (s.includes("pencil")) return "✏️";
  if (s.includes("ball")) return "⚽";
  if (s.includes("toy")) return "🧸";
  if (s.includes("button")) return "🔘";

  return "⬤";
}

function stripLeadingCountLabel(input?: string) {
  const t = String(input || "").trim();
  if (!t) return "";
  return t.replace(/^\s*\d+\s+/, "").replace(/^\s*\(\d+\)\s+/, "").trim();
}

function Diagram({ spec }: { spec: DiagramSpec }) {
  const W = 640;
  const H = 220;

  const baseStroke = "#111827";
  const shadeFill = "#93c5fd";
  const lightFill = "#ffffff";

  if (spec.type === "pizza") {
    const slices = clampInt(spec.slices, 2, 24);
    const shaded = clampInt(spec.shaded, 0, slices);

    const cx = W / 2;
    const cy = 105;
    const r = 88;

    const sliceAngle = (Math.PI * 2) / slices;

    const wedgePath = (i: number) => {
      const a0 = i * sliceAngle - Math.PI / 2;
      const a1 = (i + 1) * sliceAngle - Math.PI / 2;
      const x0 = cx + r * Math.cos(a0);
      const y0 = cy + r * Math.sin(a0);
      const x1 = cx + r * Math.cos(a1);
      const y1 = cy + r * Math.sin(a1);
      const largeArc = a1 - a0 > Math.PI ? 1 : 0;

      return `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${largeArc} 1 ${x1} ${y1} Z`;
    };

    const cleanLabel = stripLeadingCountLabel(spec.label);

    return (
      <div className="w-full">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Diagram">
          <circle cx={cx} cy={cy} r={r} fill={lightFill} stroke={baseStroke} strokeWidth={2} />
          {Array.from({ length: slices }, (_, i) => (
            <path
              key={i}
              d={wedgePath(i)}
              fill={i < shaded ? shadeFill : "transparent"}
              stroke={baseStroke}
              strokeWidth={1}
            />
          ))}
          {!!cleanLabel && (
            <text x={W / 2} y={205} textAnchor="middle" fontSize={14} fill="#111827">
              {cleanLabel}
            </text>
          )}
        </svg>
      </div>
    );
  }

  if (spec.type === "grid") {
    const rows = clampInt(spec.rows, 1, 10);
    const cols = clampInt(spec.cols, 1, 12);
    const total = rows * cols;
    const shaded = clampInt(spec.shaded, 0, total);

    const padding = 30;
    const gridW = W - padding * 2;
    const gridH = 160;
    const cellW = gridW / cols;
    const cellH = gridH / rows;

    const cleanLabel = stripLeadingCountLabel(spec.label);

    return (
      <div className="w-full">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Diagram">
          <rect x={padding} y={25} width={gridW} height={gridH} fill={lightFill} stroke={baseStroke} strokeWidth={2} />
          {Array.from({ length: total }, (_, i) => {
            const r = Math.floor(i / cols);
            const c = i % cols;
            const x = padding + c * cellW;
            const y = 25 + r * cellH;
            return (
              <rect
                key={i}
                x={x}
                y={y}
                width={cellW}
                height={cellH}
                fill={i < shaded ? shadeFill : "transparent"}
                stroke={baseStroke}
                strokeWidth={1}
              />
            );
          })}
          {!!cleanLabel && (
            <text x={W / 2} y={205} textAnchor="middle" fontSize={14} fill="#111827">
              {cleanLabel}
            </text>
          )}
        </svg>
      </div>
    );
  }

  if (spec.type === "pictogram") {
    const count = clampInt(spec.count, 1, 24);
    const shaded = clampInt(spec.shaded ?? 0, 0, count);
    const em = emojiForItem(spec.item);

    const cleanLabel = stripLeadingCountLabel(spec.label);

    const useSingleBig = count > 12;

    const paddingX = 30;
    const paddingY = 22;
    const areaW = W - paddingX * 2;
    const areaH = 170;

    if (useSingleBig) {
      return (
        <div className="w-full">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Diagram">
            <rect
              x={paddingX}
              y={paddingY}
              width={areaW}
              height={areaH}
              rx={14}
              fill={lightFill}
              stroke={baseStroke}
              strokeWidth={2}
            />
            <text
              x={W / 2}
              y={paddingY + areaH / 2 + 52}
              textAnchor="middle"
              fontSize={150}
              fontFamily="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji"
            >
              {em}
            </text>

            {!!cleanLabel && (
              <text x={W / 2} y={205} textAnchor="middle" fontSize={14} fill="#111827">
                {cleanLabel}
              </text>
            )}
          </svg>
        </div>
      );
    }

    const cols = Math.min(8, count);
    const rows = Math.ceil(count / cols);

    const cellW = areaW / cols;
    const cellH = areaH / rows;

    const fontSize = Math.max(20, Math.min(36, Math.floor(Math.min(cellW, cellH) * 0.6)));

    return (
      <div className="w-full">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Diagram">
          <rect
            x={paddingX}
            y={paddingY}
            width={areaW}
            height={areaH}
            rx={14}
            fill={lightFill}
            stroke={baseStroke}
            strokeWidth={2}
          />
          {Array.from({ length: count }, (_, i) => {
            const r = Math.floor(i / cols);
            const c = i % cols;
            const x = paddingX + c * cellW + cellW / 2;
            const y = paddingY + r * cellH + cellH / 2;

            const isShaded = i < shaded;
            return (
              <g key={i}>
                {isShaded && (
                  <rect
                    x={paddingX + c * cellW + 6}
                    y={paddingY + r * cellH + 6}
                    width={cellW - 12}
                    height={cellH - 12}
                    rx={12}
                    fill={shadeFill}
                    opacity={0.65}
                  />
                )}
                <text x={x} y={y + fontSize * 0.35} textAnchor="middle" fontSize={fontSize}>
                  {em}
                </text>
              </g>
            );
          })}

          {!!cleanLabel && (
            <text x={W / 2} y={205} textAnchor="middle" fontSize={14} fill="#111827">
              {cleanLabel}
            </text>
          )}
        </svg>
      </div>
    );
  }

  const min = Number.isFinite((spec as DiagramNumberLine).min) ? (spec as DiagramNumberLine).min : 0;
  const max = Number.isFinite((spec as DiagramNumberLine).max) ? (spec as DiagramNumberLine).max : 10;
  const ticks = clampInt((spec as DiagramNumberLine).ticks ?? 10, 2, 20);

  const x0 = 60;
  const x1 = W - 60;
  const y = 110;

  const xToSvg = (x: number) => {
    if (max === min) return x0;
    return x0 + ((x - min) / (max - min)) * (x1 - x0);
  };

  const cleanLabel = stripLeadingCountLabel((spec as DiagramNumberLine).label);

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Diagram">
        <line x1={x0} y1={y} x2={x1} y2={y} stroke={baseStroke} strokeWidth={2} />
        {Array.from({ length: ticks + 1 }, (_, i) => {
          const x = min + (i * (max - min)) / ticks;
          const X = xToSvg(x);
          return (
            <g key={i}>
              <line x1={X} y1={y - 8} x2={X} y2={y + 8} stroke={baseStroke} strokeWidth={2} />
              <text x={X} y={y + 28} textAnchor="middle" fontSize={12} fill="#111827">
                {Number.isInteger(x) ? String(x) : x.toFixed(2)}
              </text>
            </g>
          );
        })}
        {(spec as DiagramNumberLine).marks?.map((m, i) => {
          const X = xToSvg(m.x);
          return (
            <g key={i}>
              <circle cx={X} cy={y} r={5} fill={shadeFill} stroke={baseStroke} strokeWidth={2} />
              {m.label && (
                <text x={X} y={y - 14} textAnchor="middle" fontSize={12} fill="#111827">
                  {m.label}
                </text>
              )}
            </g>
          );
        })}
        {!!cleanLabel && (
          <text x={W / 2} y={205} textAnchor="middle" fontSize={14} fill="#111827">
            {cleanLabel}
          </text>
        )}
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Text cleanup                                                       */
/* ------------------------------------------------------------------ */

const collapseRepeatedWords = (t: string) => t.replace(/\b(\w+)(\s+\1\b)+/gi, "$1");

function balanceKatex(text: string): string {
  let out = text
    .replace(/\\\(\s*([\s\S]*?)\s*\\\)/g, (_m, g) => `$ ${g} $`)
    .replace(/\\\[\s*([\s\S]*?)\s*\\\]/g, (_m, g) => `$$ ${g} $$`);

  const dollars = (out.match(/\$/g) || []).length;
  if (dollars % 2 === 1) {
    out = out.replace(/\$(?![\s\S]*\$)[\s]*$/m, "");
  }

  return out;
}

function sanitizeNoEmDash(text: string) {
  return text.replace(/\u2014|\u2013/g, " ");
}

function stripLonelyMarkdownMarkers(text: string) {
  return String(text || "")
    .split("\n")
    .filter((line) => {
      const t = line.trim();
      if (!t) return true;

      if (/^\*+$/.test(t)) return false;
      if (/^_+$/.test(t)) return false;

      if (/^(\*\s*){2,}$/.test(t)) return false;
      if (/^(_\s*){2,}$/.test(t)) return false;

      return true;
    })
    .join("\n");
}

function cleanTextForRender(text: string) {
  return balanceKatex(collapseRepeatedWords(stripLonelyMarkdownMarkers(text)));
}

/* ------------------------------------------------------------------ */
/* MP section splitter and formatting                                 */
/* ------------------------------------------------------------------ */

const MP_SECTIONS = [
  { key: "⏱️ Parent Quick Plan", aliases: ["⏱️ Parent Quick Plan"] },
  { key: "🧠 Core Idea", aliases: ["🧠 Core Idea"] },
  {
    key: "👨‍👩‍👧 Step by Step Teaching Guide",
    aliases: ["👨‍👩‍👧 Step-by-Step Teaching Guide", "👨‍👩‍👧 Step by Step Teaching Guide"],
  },
  { key: "🏠 Household Demonstration", aliases: ["🏠 Household Demonstration"] },
  { key: "🧩 Practice Together", aliases: ["🧩 Practice Together"] },
  { key: "🧑‍🏫 Parent Coaching", aliases: ["🧑‍🏫 Parent Coaching"] },
] as const;

type MPSectionKey = (typeof MP_SECTIONS)[number]["key"];

function splitMP(text: string): {
  intro: string;
  sections: Array<{ title: MPSectionKey; body: string }>;
  closing: string;
} | null {
  const raw = String(text || "");

  const found = MP_SECTIONS
    .map((s) => {
      let bestIdx = -1;
      let bestMatch = "";

      for (const a of s.aliases) {
        const i = raw.indexOf(a);
        if (i >= 0 && (bestIdx === -1 || i < bestIdx)) {
          bestIdx = i;
          bestMatch = a;
        }
      }

      if (bestIdx === -1) return null;
      return { title: s.key as MPSectionKey, i: bestIdx, match: bestMatch };
    })
    .filter(Boolean) as Array<{ title: MPSectionKey; i: number; match: string }>;

  if (!found.length) return null;

  const orderedByPosition = [...found].sort((a, b) => a.i - b.i);

  const intro = raw.slice(0, orderedByPosition[0].i).trim();

  const sections: Array<{ title: MPSectionKey; body: string }> = [];

  for (let k = 0; k < orderedByPosition.length; k++) {
    const cur = orderedByPosition[k];
    const next = orderedByPosition[k + 1];
    const start = cur.i + cur.match.length;
    const end = next ? next.i : raw.length;
    const body = raw.slice(start, end).trim();
    sections.push({ title: cur.title, body });
  }

  const last = orderedByPosition[orderedByPosition.length - 1];
  const lastStart = last.i + last.match.length;
  const afterLastHeadingAll = raw.slice(lastStart);
  const lastSectionBody = sections[sections.length - 1]?.body ?? "";
  const posLastBody = afterLastHeadingAll.indexOf(lastSectionBody);
  let closing = "";
  if (posLastBody >= 0) {
    closing = afterLastHeadingAll.slice(posLastBody + lastSectionBody.length).trim();
  }

  return { intro, sections, closing };
}

function formatStepByStepBody(body: string) {
  let t = String(body || "");
  t = t.replace(/\s*You can say:\s*/g, "\n\nYou can say:\n");
  t = t.replace(/([0-9A-Za-z\)\]]\s*=\s*[^.\n]+)\.\s+/g, "$1.\n").replace(/;\s+/g, ";\n");
  return t.trim();
}

function keepOnlyFirstDiagramBlock(body: string) {
  const src = String(body || "");
  const fence = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  let out = "";
  let last = 0;
  let seen = false;

  let m: RegExpExecArray | null;
  while ((m = fence.exec(src)) !== null) {
    const full = m[0];
    const lang = (m[1] || "").trim().toLowerCase();
    const inner = (m[2] || "").trim();

    const before = src.slice(last, m.index);
    out += before;

    const obj = parseJsonObject(inner);
    const isDiagramLike =
      lang === "diagram" ||
      (lang === "json" && !!obj && (looksLikeDiagramSpec(obj) || looksLikeDiagramSpec(obj?.diagram))) ||
      (!!obj && (looksLikeDiagramSpec(obj) || looksLikeDiagramSpec(obj?.diagram)));

    if (isDiagramLike) {
      if (!seen) {
        out += full;
        seen = true;
      }
    } else {
      out += full;
    }

    last = m.index + full.length;
  }

  out += src.slice(last);
  return out;
}

function hasAnyDiagramFence(text: string) {
  const t = String(text || "");
  if (t.includes("```diagram")) return true;

  const fence = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = fence.exec(t)) !== null) {
    const lang = (m[1] || "").trim().toLowerCase();
    const inner = (m[2] || "").trim();
    if (lang !== "json" && lang !== "diagram") continue;
    const obj = parseJsonObject(inner);
    if (obj && (looksLikeDiagramSpec(obj) || looksLikeDiagramSpec(obj?.diagram))) return true;
  }

  return false;
}

function firstIntInText(t: string) {
  const m = String(t || "").match(/(\d+)/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function inferDiagramFromText(sectionTitle: MPSectionKey, bodyRaw: string): DiagramSpec | null {
  const body = String(bodyRaw || "").toLowerCase();

  const rect = body.match(/rectangle[^.\n]*divided\s+into\s+(\d+)[^.\n]*with\s+(\d+)\s+shaded/);
  if (rect) {
    const parts = clampInt(Number(rect[1]), 2, 24);
    const shaded = clampInt(Number(rect[2]), 0, parts);
    return { type: "grid", rows: 1, cols: parts, shaded };
  }

  const circ = body.match(/circle[^.\n]*divided\s+into\s+(\d+)[^.\n]*with\s+(\d+)\s+shaded/);
  if (circ) {
    const slices = clampInt(Number(circ[1]), 2, 24);
    const shaded = clampInt(Number(circ[2]), 0, slices);
    return { type: "pizza", slices, shaded };
  }

  const outOf = body.match(/(\d+)\s*(?:out\s+of|\/)\s*(\d+)/);
  if (outOf) {
    const a = clampInt(Number(outOf[1]), 0, 24);
    const b = clampInt(Number(outOf[2]), 2, 24);

    if (sectionTitle === "🧠 Core Idea") {
      return { type: "grid", rows: 1, cols: b, shaded: a, label: `Chosen ${a} out of total ${b}` };
    }

    if (body.includes("pizza") || body.includes("slice") || body.includes("pie") || body.includes("circle")) {
      return { type: "pizza", slices: b, shaded: a, label: `Out of ${b}, chosen ${a}` };
    }

    if (body.includes("rectangle") || body.includes("grid")) {
      return { type: "grid", rows: 1, cols: b, shaded: a, label: `Out of ${b}, chosen ${a}` };
    }

    const item =
      body.includes("coin")
        ? "coins"
        : body.includes("button")
          ? "buttons"
          : body.includes("marble")
            ? "marbles"
            : body.includes("apple")
              ? "apples"
              : body.includes("cookie")
                ? "cookies"
                : "items";

    return { type: "pictogram", item, count: b, shaded: a, label: `Out of ${b}, shaded ${a}` };
  }

  if (sectionTitle === "🏠 Household Demonstration") {
    const item =
      body.includes("coin")
        ? "coins"
        : body.includes("button")
          ? "buttons"
          : body.includes("marble")
            ? "marbles"
            : body.includes("apple")
              ? "apples"
              : body.includes("cookie")
                ? "cookies"
                : body.includes("pizza")
                  ? "pizza"
                  : "";
    if (item) return { type: "pictogram", item, count: 16 };
  }

  if (sectionTitle === "🧩 Practice Together") {
    if (body.includes("pizza")) return { type: "pizza", slices: 8, shaded: 3 };
    if (body.includes("circle")) return { type: "pizza", slices: 6, shaded: 2 };
    if (body.includes("rectangle")) return { type: "grid", rows: 1, cols: 6, shaded: 2 };

    const item =
      body.includes("coin")
        ? "coins"
        : body.includes("button")
          ? "buttons"
          : body.includes("marble")
            ? "marbles"
            : body.includes("apple")
              ? "apples"
              : body.includes("cookie")
                ? "cookies"
                : "";
    if (item) return { type: "pictogram", item, count: 16 };

    const n = firstIntInText(body);
    if (n && n >= 2 && n <= 24) return { type: "grid", rows: 1, cols: n, shaded: Math.max(1, Math.floor(n / 3)) };
  }

  return null;
}

function injectInferredDiagram(sectionTitle: MPSectionKey, body: string) {
  const cleaned = stripLonelyMarkdownMarkers(body);
  if (hasAnyDiagramFence(cleaned)) return cleaned;

  const spec = inferDiagramFromText(sectionTitle, cleaned);
  if (!spec) return cleaned;

  const fence = "```diagram\n" + JSON.stringify(spec) + "\n```\n\n";
  return fence + cleaned;
}

function Hr() {
  return <div className="h-px w-full bg-sky-200 my-3" />;
}

/* ------------------------------------------------------------------ */
/* Explanation mode section splitter                                  */
/* ------------------------------------------------------------------ */

const EX_SECTIONS = [
  "Overview",
  "Given and Goal",
  "Formulas and Definitions",
  "Step by Step Solution",
  "Final Answer",
  "Parent takeaway",
] as const;

type EXSectionKey = (typeof EX_SECTIONS)[number];

function splitExplanation(text: string): { sections: Array<{ title: EXSectionKey; body: string }> } | null {
  const raw = String(text || "");
  const matches: Array<{ title: EXSectionKey; i: number; match: string }> = [];

  for (const k of EX_SECTIONS) {
    const needle = `**${k}**`;
    const idx = raw.indexOf(needle);
    if (idx >= 0) matches.push({ title: k, i: idx, match: needle });
  }

  if (!matches.length) return null;

  const ordered = matches.sort((a, b) => a.i - b.i);

  const sections: Array<{ title: EXSectionKey; body: string }> = [];
  for (let i = 0; i < ordered.length; i++) {
    const cur = ordered[i];
    const next = ordered[i + 1];
    const start = cur.i + cur.match.length;
    const end = next ? next.i : raw.length;
    sections.push({ title: cur.title, body: raw.slice(start, end).trim() });
  }

  return { sections };
}

/* ------------------------------------------------------------------ */
/* Markdown components and improved details rendering                  */
/* ------------------------------------------------------------------ */

function CodeRenderer(props: { inline?: boolean; className?: string; children?: React.ReactNode }) {
  const { inline, className, children } = props;
  const lang = (className || "").replace("language-", "").trim().toLowerCase();
  const raw = String(children ?? "");

  if (inline) {
    return <code className="rounded bg-gray-100 px-1 py-0.5 text-[0.95em] break-words">{raw}</code>;
  }

  const trimmed = raw.trim();

  if (lang === "diagram" || lang === "json" || lang === "") {
    const obj = parseJsonObject(trimmed);
    if (obj && looksLikeDiagramSpec(obj)) return <Diagram spec={obj} />;
    if (obj?.diagram && looksLikeDiagramSpec(obj.diagram)) return <Diagram spec={obj.diagram} />;
  }

  if (lang === "graph" || lang === "json" || lang === "") {
    const obj = parseJsonObject(trimmed);
    if (obj && looksLikeGraphSpec(obj)) return <Graph spec={obj} />;
  }
  const fallback = parseJsonObject(trimmed);
  if (fallback && looksLikeGraphSpec(fallback)) return <Graph spec={fallback} />;

  return (
    <pre className="overflow-x-auto rounded-md bg-gray-900 text-gray-100 p-3 text-sm">
      <code className={className}>{trimmed}</code>
    </pre>
  );
}

const markdownComponents = {
  h1: (p: any) => <h1 className="font-bold text-lg mt-4 mb-2" {...p} />,
  h2: (p: any) => <h2 className="font-bold text-base mt-3 mb-2" {...p} />,
  h3: (p: any) => <h3 className="font-semibold text-base mt-2 mb-1" {...p} />,
  strong: (p: any) => <strong className="font-bold text-gray-900" {...p} />,
  p: (p: any) => <p className="mb-2 whitespace-pre-wrap leading-relaxed break-words" {...p} />,
  ul: (p: any) => <ul className="list-disc pl-5 space-y-1 break-words" {...p} />,
  ol: (p: any) => <ol className="list-decimal pl-5 space-y-1 break-words" {...p} />,
  li: (p: any) => <li className="mb-1 break-words" {...p} />,
  blockquote: (p: any) => (
    <blockquote
      className="border-l-4 border-blue-500 pl-3 py-2 bg-blue-50 rounded-md my-2 font-semibold text-gray-700 break-words"
      {...p}
    />
  ),
  code: CodeRenderer,
};

function stripTags(s: string) {
  return String(s || "").replace(/<[^>]*>/g, "");
}

/*
  Fix 1: Stop "Answer:" (and similar) leaking into the <summary> line.
  This happens when the model accidentally puts extra text into <summary> or adds a newline.
  We hard cut summary to the first line and remove common leak labels.
*/
function simplifySummaryText(s: string) {
  let t = stripTags(s)
    .replace(/\*\*/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!t) return "Open";

  // Keep only the first visual line
  t = t.split("\n")[0]?.trim() || t;

  // If the model leaked content into summary, cut it off
  const leak = t.match(/^(.*?)(?:\bAnswer:|\bWhy:|\bSolution:|\bFinal Answer:|\bExplanation:)/i);
  if (leak?.[1]) t = leak[1].trim();

  // Also remove any leftover trailing separators
  t = t.replace(/\s*[:\|\-]+\s*$/g, "").trim();

  return t || "Open";
}

function renderMarkdownWithDetails(textRaw: string) {
  const text = stripLonelyMarkdownMarkers(String(textRaw || ""));
  const elements: React.ReactNode[] = [];

  const regex = /<details[^>]*>\s*<summary[^>]*>([\s\S]*?)<\/summary>\s*([\s\S]*?)<\/details>/gi;

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let idx = 0;

  while ((match = regex.exec(text)) !== null) {
    const fullMatch = match[0];
    const summaryInner = match[1] || "";
    const bodyInner = match[2] || "";

    if (match.index > lastIndex) {
      const before = text.slice(lastIndex, match.index);
      if (before.trim()) {
        elements.push(
          <ReactMarkdown
            key={"mp-md-before-" + idx}
            remarkPlugins={[remarkMath]}
            rehypePlugins={[[rehypeKatex, { strict: false }], rehypeRaw]}
            components={markdownComponents as any}
          >
            {before}
          </ReactMarkdown>
        );
      }
    }

    const summaryText = simplifySummaryText(summaryInner);

    elements.push(
      <details key={"mp-details-" + idx} className="my-2 rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-sm">
        <summary className="cursor-pointer font-semibold text-gray-900 select-none">{summaryText}</summary>
        <div className="mt-2 pt-2 border-t border-gray-100">
          <ReactMarkdown
            remarkPlugins={[remarkMath]}
            rehypePlugins={[[rehypeKatex, { strict: false }], rehypeRaw]}
            components={markdownComponents as any}
          >
            {stripLonelyMarkdownMarkers(bodyInner.trim())}
          </ReactMarkdown>
        </div>
      </details>
    );

    lastIndex = match.index + fullMatch.length;
    idx++;
  }

  if (lastIndex < text.length) {
    const rest = text.slice(lastIndex);
    if (rest.trim()) {
      elements.push(
        <ReactMarkdown
          key={"mp-md-after-" + idx}
          remarkPlugins={[remarkMath]}
          rehypePlugins={[[rehypeKatex, { strict: false }], rehypeRaw]}
          components={markdownComponents as any}
        >
          {rest}
        </ReactMarkdown>
      );
    }
  }

  if (!elements.length) {
    elements.push(
      <ReactMarkdown
        key="mp-md-only"
        remarkPlugins={[remarkMath]}
        rehypePlugins={[[rehypeKatex, { strict: false }], rehypeRaw]}
        components={markdownComponents as any}
      >
        {text}
      </ReactMarkdown>
    );
  }

  return elements;
}

/* ------------------------------------------------------------------ */
/* Presentable assistant card renderers                                */
/* ------------------------------------------------------------------ */

function renderAssistantTeachingCard(textRaw: string) {
  const text = cleanTextForRender(textRaw);
  const split = splitMP(text);
  if (!split) return null;

  const intro = stripLonelyMarkdownMarkers(split.intro.trim());
  const closing = stripLonelyMarkdownMarkers(split.closing.trim());

  const cleanedSections = split.sections.map((s) => {
    let body = stripLonelyMarkdownMarkers(s.body);

    if (s.title === "👨‍👩‍👧 Step by Step Teaching Guide") {
      body = formatStepByStepBody(body);
    }

    if (s.title === "🏠 Household Demonstration") {
      body = keepOnlyFirstDiagramBlock(body);
      body = injectInferredDiagram(s.title, body);
    }

    if (s.title === "🧩 Practice Together") {
      body = injectInferredDiagram(s.title, body);
    }

    if (s.title === "🧠 Core Idea") {
      body = injectInferredDiagram(s.title, body);
    }

    return { ...s, body };
  });

  return (
    <div className="w-full rounded-2xl border border-gray-200 bg-white px-5 py-4 break-words overflow-hidden shadow-sm">
      {!!intro && (
        <>
          <div className="text-gray-900">{renderMarkdownWithDetails(intro)}</div>
          <Hr />
        </>
      )}

      {cleanedSections.map((s) => (
        <div key={s.title}>
          <div className="font-bold text-gray-900 flex items-center gap-2 text-[15px]">
            <span>{s.title}</span>
          </div>
          <div className="mt-2">{renderMarkdownWithDetails(s.body)}</div>
          <Hr />
        </div>
      ))}

      {!!closing && <div className="mt-1">{renderMarkdownWithDetails(closing)}</div>}
    </div>
  );
}

function renderAssistantExplanationCard(textRaw: string) {
  const text = cleanTextForRender(textRaw);
  const split = splitExplanation(text);
  if (!split) return null;

  return (
    <div className="w-full rounded-2xl border border-gray-200 bg-white px-5 py-4 break-words overflow-hidden shadow-sm">
      {split.sections.map((s, i) => (
        <div key={s.title}>
          <div className="font-bold text-gray-900 text-[15px]">{s.title}</div>
          <div className="mt-2">{renderMarkdownWithDetails(s.body)}</div>
          {i !== split.sections.length - 1 && <Hr />}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Image and file helpers                                             */
/* ------------------------------------------------------------------ */

async function fileToBase64(imgFile: File) {
  try {
    const bitmap = await (window as any).createImageBitmap?.(imgFile);
    if (bitmap) {
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/jpeg", 0.86);
    }
  } catch {}
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(imgFile);
  });
}

/* ------------------------------------------------------------------ */
/* Small icon button                                                  */
/* ------------------------------------------------------------------ */

function IconButton({
  label,
  onClick,
  pressed,
  disabled,
  children,
}: React.PropsWithChildren<{
  label: string;
  onClick?: () => void;
  pressed?: boolean;
  disabled?: boolean;
}>) {
  return (
    <div className="relative group">
      <button
        type="button"
        className={`h-10 w-10 grid place-items-center rounded-lg border bg-white hover:bg-gray-50 text-xl ${
          pressed ? "bg-red-100 border-red-300" : ""
        } disabled:opacity-50`}
        aria-pressed={!!pressed}
        aria-label={label}
        title={label}
        onClick={onClick}
        disabled={disabled}
      >
        {children}
      </button>
      <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 -top-9 px-2 py-1 rounded bg-gray-900 text-white text-xs opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition">
        {label}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main                                                               */
/* ------------------------------------------------------------------ */

export default function ChatPageClient() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [logoOk, setLogoOk] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isEphemeral, setIsEphemeral] = useState(true);
  const inflightRef = useRef(false);

  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const attachInputRef = useRef<HTMLInputElement>(null);

  const [extractedQuestions, setExtractedQuestions] = useState<ExtractedQuestion[]>([]);

  const [usage, setUsage] = useState<Usage>(() => loadUsage());

  const [mode, setMode] = useState<"teaching" | "explanation">("teaching");

  const [usagePopoverOpen, setUsagePopoverOpen] = useState(false);

  useEffect(() => {
    setSessions(loadSessions());
    const id = uid();
    setActiveId(id);
    setIsEphemeral(true);
    setMessages([]);
    setExtractedQuestions([]);
    setUsage(loadUsage());
  }, []);

  useEffect(() => {
    const u = loadUsage();
    setUsage(u);
  }, [messages.length, attachedImages.length]);

  useEffect(() => {
    if (activeId) setExtractedQuestions(loadExtracted(activeId));
  }, [activeId]);

  useEffect(() => {
    if (activeId && !isEphemeral) setMessages(loadMessages(activeId));
  }, [activeId, isEphemeral]);

  useEffect(() => {
    if (activeId && !isEphemeral) saveMessages(activeId, messages);
  }, [activeId, isEphemeral, messages]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) {
        setUsagePopoverOpen(false);
        return;
      }
      if (target.closest?.("[data-usage-popover-root='true']")) return;
      setUsagePopoverOpen(false);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setUsagePopoverOpen(false);
    };

    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const hasUser = useMemo(() => messages.some((m) => m.role === "user"), [messages]);
  const showSplash = !hasUser && !loading && input.trim().length === 0;

  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      endRef.current?.scrollIntoView({ block: "end" });
    });
  }, [messages, loading]);

  function newChat() {
    const id = uid();
    setActiveId(id);
    setIsEphemeral(true);
    setMessages([]);
    setInput("");
    setIsSidebarOpen(false);
    setAttachedImages([]);
    setExtractedQuestions([]);
    setUsagePopoverOpen(false);
    clearExtracted(id);
  }

  function renameChat(id: string) {
    const title = prompt("Rename chat:", sessions.find((s) => s.id === id)?.title || "");
    if (title === null) return;
    const next = sessions.map((s) => (s.id === id ? { ...s, title: title.trim() || "Untitled", updatedAt: Date.now() } : s));
    setSessions(next);
    saveSessions(next);
  }

  function deleteChat(id: string) {
    if (!confirm("Delete this chat? This cannot be undone.")) return;
    const next = sessions.filter((s) => s.id !== id);
    setSessions(next);
    saveSessions(next);
    if (isClient) {
      localStorage.removeItem(MKEY(id));
      localStorage.removeItem(QKEY(id));
    }
    if (!next.length) {
      newChat();
    } else {
      setActiveId(next[0].id);
      setIsEphemeral(false);
    }
  }

  async function onAttachInput(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const u = loadUsage();
    const imageFiles = files.filter((f) => (f.type || "").startsWith("image/"));
    if (imageFiles.length) {
      const remaining = MONTHLY_IMAGE_LIMIT - u.imagesSent;
      if (remaining <= 0) {
        alert(`Monthly image limit reached (${MONTHLY_IMAGE_LIMIT}).`);
        e.currentTarget.value = "";
        return;
      }
      if (imageFiles.length > remaining) {
        alert(`You can upload only ${remaining} more image(s) this month.`);
      }
    }

    let addedImages = 0;

    for (const file of files) {
      const isImage = (file.type || "").startsWith("image/");
      if (isImage) {
        const uNow = loadUsage();
        if (uNow.imagesSent + addedImages >= MONTHLY_IMAGE_LIMIT) continue;

        const base64 = await fileToBase64(file);
        setAttachedImages((prev) => [...prev, base64]);
        addedImages += 1;
      } else {
        const fd = new FormData();
        fd.append("file", file, file.name);
        try {
          const r = await fetch("/api/filetext", { method: "POST", body: fd });
          const j = await r.json();
          if (j?.kind === "text" && j.text) {
            const snippet = j.text.trim();
            const header = `\n\n[From ${j.name}]\n`;
            setInput((prev) => (prev ? prev + header + snippet : header + snippet));
          } else if (j?.kind === "unsupported") {
            alert(`Unsupported file: ${j.name}`);
          } else {
            alert(`Could not read ${file.name}.`);
          }
        } catch {
          alert(`Failed to process ${file.name}.`);
        }
      }
    }

    setUsage(loadUsage());
    e.currentTarget.value = "";
  }

  function removeImage(idx: number) {
    setAttachedImages((prev) => prev.filter((_, i) => i !== idx));
  }

  function canSendNow(nextImagesCount: number) {
    const u = loadUsage();
    if (u.messagesSent >= MONTHLY_MESSAGE_LIMIT) {
      alert(`Monthly message limit reached (${MONTHLY_MESSAGE_LIMIT}).`);
      return false;
    }
    if (u.imagesSent + nextImagesCount > MONTHLY_IMAGE_LIMIT) {
      const remaining = Math.max(0, MONTHLY_IMAGE_LIMIT - u.imagesSent);
      alert(`Monthly image limit exceeded. You can upload ${remaining} more image(s) this month.`);
      return false;
    }
    return true;
  }

  function bumpUsage(imagesUsed: number) {
    const u = loadUsage();
    const next: Usage = {
      month: u.month,
      messagesSent: u.messagesSent + 1,
      imagesSent: u.imagesSent + imagesUsed,
    };
    saveUsage(next);
    setUsage(next);
  }

  async function sendMessage(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (inflightRef.current || loading) return;

    const content = input.trim();
    if ((!content && attachedImages.length === 0) || !activeId) return;

    if (!canSendNow(attachedImages.length)) return;

    inflightRef.current = true;
    setLoading(true);

    const now = Date.now();
    const userVisible = content || (attachedImages.length ? "_[Sent a photo]_" : "");
    const userMsg: ChatMessage = { id: uid(), role: "user", content: userVisible, ts: now };
    const phId = uid();
    const placeholder: ChatMessage = { id: phId, role: "assistant", content: "", ts: Date.now(), placeholder: true };

    setMessages((prev) => [...prev, userMsg, placeholder]);

    const imagesToSend = [...attachedImages];
    setAttachedImages([]);
    setInput("");
    setUsagePopoverOpen(false);

    bumpUsage(imagesToSend.length);

    if (isEphemeral) {
      const card: ChatSession = {
        id: activeId,
        title: (content || "New chat").replace(/\s+/g, " ").slice(0, 40) || "New chat",
        createdAt: now,
        updatedAt: now,
      };
      const updated = [card, ...sessions];
      setSessions(updated);
      saveSessions(updated);
      setIsEphemeral(false);
      saveMessages(activeId, [...messages, userMsg, placeholder]);
    } else {
      const updated = sessions.map((s) => (s.id === activeId ? { ...s, updatedAt: now } : s));
      setSessions(updated);
      saveSessions(updated);
    }

    try {
      const history = [...messages, userMsg].map(({ id, ts, placeholder: _ph, ...rest }) => rest);
      const lastIdx = history.length - 1;
      const lastUser = history[lastIdx];

      const parts: any[] = [];
      if (content) parts.push({ type: "text", text: content });
      for (const dataUrl of imagesToSend) parts.push({ type: "image_url", image_url: dataUrl });

      (history as any)[lastIdx] = { ...lastUser, contentParts: parts.length ? parts : undefined };

      const historyToSend: any[] = [...history];

      if (extractedQuestions.length) {
        historyToSend.push({
          role: "system",
          content: "[MP_EXTRACTED_QUESTIONS] " + JSON.stringify({ questions: extractedQuestions }),
        });
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({ messages: historyToSend, mode }),
      });

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let sawDone = false;

      const updatePlaceholder = (delta: string) => {
        setMessages((prev) => {
          const copy = [...prev];
          const i = copy.findIndex((m) => m.id === phId);
          if (i >= 0) copy[i] = { ...copy[i], content: copy[i].content + delta };
          return copy;
        });
      };

      const finalize = async () => {
        setMessages((prev) => {
          const copy = [...prev];
          const i = copy.findIndex((m) => m.id === phId);
          if (i >= 0) {
            copy[i] = { ...copy[i], placeholder: false, content: cleanTextForRender(copy[i].content) };
          }
          return copy;
        });

        if (activeId) {
          let snap: ChatMessage[] = [];
          setMessages((p) => ((snap = p), p));
          saveMessages(activeId, snap);
        }
      };

      const handleChunk = (chunk: string) => {
        buffer += chunk;
        const packets = buffer.split(/\r?\n\r?\n/);
        buffer = packets.pop() ?? "";

        for (const pkt of packets) {
          const lines = pkt.split(/\r?\n/).filter((l) => l.startsWith("data:"));
          for (const line of lines) {
            const json = line.slice(5).trim();
            if (!json) continue;

            let evt: any;
            try {
              evt = JSON.parse(json);
            } catch {
              continue;
            }

            if (evt?.type === "token") {
              const t = typeof evt.t === "string" ? evt.t : "";
              if (t) updatePlaceholder(t);
            } else if (evt?.type === "questions") {
              const qs = Array.isArray(evt.questions) ? evt.questions : [];
              if (activeId && qs.length) {
                setExtractedQuestions(qs);
                saveExtracted(activeId, qs);
              }
            } else if (evt?.type === "done") {
              sawDone = true;
              finalize();
            }
          }
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        handleChunk(decoder.decode(value, { stream: true }));
      }

      if (buffer) handleChunk(buffer);
      if (!sawDone) await finalize();
    } catch {
      setMessages((prev) => {
        const copy = [...prev];
        const i = copy.findIndex((m) => m.id === phId);
        const msg: ChatMessage = { id: uid(), role: "assistant", content: "⚠️ Stream error. Please try again.", ts: Date.now() };
        if (i >= 0) copy[i] = msg;
        else copy.push(msg);
        return copy;
      });
    } finally {
      setLoading(false);
      inflightRef.current = false;
      setUsage(loadUsage());
    }
  }

  const messagesRemaining = Math.max(0, MONTHLY_MESSAGE_LIMIT - (usage?.messagesSent ?? 0));
  const imagesRemaining = Math.max(0, MONTHLY_IMAGE_LIMIT - (usage?.imagesSent ?? 0));

  const CONTENT_MAX = "max-w-5xl";

  const TOP_ROW_H = 44;
  const MODE_ROW_H = 38;
  const FIXED_TOP_BAR_PX = TOP_ROW_H + MODE_ROW_H;

  return (
    <div className="w-full min-h-screen bg-slate-50">
      <button
        type="button"
        className="md:hidden fixed left-3 top-20 z-50 rounded-md border bg-white px-3 py-2 text-sm shadow"
        aria-label="Open history"
        onClick={() => setIsSidebarOpen(true)}
      >
        ☰
      </button>

      <aside
        className={`fixed top-16 bottom-0 left-0 z-40 w-64 bg-white border-r transform transition-transform duration-300 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 flex flex-col`}
      >
        <div className="p-3 border-b flex items-center gap-2">
          <button
            type="button"
            onClick={newChat}
            className="w-full rounded-lg border px-3 py-2 text-sm font-medium bg-white hover:bg-gray-50"
          >
            + New chat
          </button>
          <button
            type="button"
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden rounded-lg border px-2 py-1 text-xs"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {sessions.map((s) => (
            <div
              key={s.id}
              className={`group px-3 py-2 border-b cursor-pointer ${
                s.id === activeId && !isEphemeral ? "bg-blue-50" : "hover:bg-gray-50"
              }`}
              onClick={() => {
                setActiveId(s.id);
                setIsEphemeral(false);
                setIsSidebarOpen(false);
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="truncate text-sm font-medium">{s.title || "Untitled"}</div>
                <div className="opacity-0 group-hover:opacity-100 transition flex gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      renameChat(s.id);
                    }}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteChat(s.id);
                    }}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="text-[11px] text-gray-500">{pretty(s.updatedAt)}</div>
            </div>
          ))}
        </div>

        <div className="p-3 border-t">
          <button
            type="button"
            onClick={() => {
              if (!confirm("Clear all chat history? This cannot be undone.")) return;
              const ids = loadSessions().map((s) => s.id);
              ids.forEach((id) => {
                localStorage.removeItem(MKEY(id));
                localStorage.removeItem(QKEY(id));
              });
              localStorage.removeItem(SESSIONS_KEY);
              setSessions([]);
              newChat();
            }}
            className="w-full rounded-lg border border-red-300 text-red-600 px-3 py-2 text-sm hover:bg-red-50"
          >
            Clear History
          </button>
        </div>
      </aside>

      {isSidebarOpen && <div className="fixed inset-0 z-30 bg-black/30 md:hidden" onClick={() => setIsSidebarOpen(false)} />}

      <div className="relative pt-16 md:pt-16 md:ml-64">
        <div
          className="fixed top-16 right-0 left-0 md:left-64 z-40 bg-slate-50/95 backdrop-blur border-b"
          style={{ height: FIXED_TOP_BAR_PX }}
        >
          <div className="border-b" style={{ height: TOP_ROW_H }}>
            <div className={`mx-auto w-full ${CONTENT_MAX} px-4 h-full flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                {logoOk ? (
                  <Image
                    src="/logo.png"
                    alt="MathParenting logo"
                    width={28}
                    height={28}
                    className="rounded-md"
                    priority
                    onError={() => setLogoOk(false)}
                  />
                ) : (
                  <div className="h-7 w-7 rounded-md bg-blue-600 text-white text-xs font-bold grid place-items-center">
                    MP
                  </div>
                )}
                <div className="text-[15px] font-semibold text-gray-900">Where Parents Become Math Mentors</div>
              </div>
            </div>
          </div>

          <div style={{ height: MODE_ROW_H }}>
            <div className={`mx-auto w-full ${CONTENT_MAX} px-4 h-full flex items-center`}>
              <div className="w-full rounded-xl border bg-white overflow-hidden flex">
                <button
                  type="button"
                  onClick={() => setMode("teaching")}
                  className={`flex-1 py-2 text-sm font-semibold ${
                    mode === "teaching" ? "bg-blue-600 text-white" : "bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                  aria-pressed={mode === "teaching"}
                >
                  Teaching
                </button>
                <div className="w-px bg-gray-200" />
                <button
                  type="button"
                  onClick={() => setMode("explanation")}
                  className={`flex-1 py-2 text-sm font-semibold ${
                    mode === "explanation" ? "bg-blue-600 text-white" : "bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                  aria-pressed={mode === "explanation"}
                >
                  Explanation
                </button>
              </div>
            </div>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="min-h-[calc(100svh-16rem)] md:min-h-[calc(100svh-12rem)] pb-28 md:pb-36 overflow-y-auto"
          style={{ paddingTop: FIXED_TOP_BAR_PX + 10 }}
        >
          <div className={`mx-auto w-full ${CONTENT_MAX} px-4 py-4`}>
            {showSplash && (
              <div className="flex items-center justify-center py-14">
                <div className="flex flex-col items-center gap-4 opacity-95">
                  <Image src="/logo.png" alt="MathParenting logo" width={96} height={96} className="rounded-2xl shadow" priority />
                  <div className="text-2xl font-extrabold tracking-tight text-gray-800">MathParenting</div>
                  <p className="text-gray-500 text-sm text-center max-w-md">
                    Making math easier for parents to teach.
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-col space-y-3">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`relative w-full md:max-w-[96%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed shadow break-words overflow-hidden ${
                      m.role === "user" ? "bg-blue-600 text-white md:max-w-[70%]" : "bg-gray-50 text-gray-900 border border-gray-200"
                    }`}
                  >
                    {m.role === "assistant" ? (
                      mode === "explanation" ? (
                        renderAssistantExplanationCard(m.content || (m.placeholder ? "Typing…" : "")) ??
                        renderMarkdownWithDetails(m.content || (m.placeholder ? "Typing…" : ""))
                      ) : (
                        renderAssistantTeachingCard(m.content || (m.placeholder ? "Typing…" : "")) ??
                        renderMarkdownWithDetails(m.content || (m.placeholder ? "Typing…" : ""))
                      )
                    ) : (
                      renderMarkdownWithDetails(m.content || (m.placeholder ? "Typing…" : ""))
                    )}
                  </div>
                </div>
              ))}
              <div ref={endRef} className="h-1" />
            </div>
          </div>
        </div>

        <div className="fixed bottom-0 right-0 left-0 md:left-64 z-50 bg-white/95 backdrop-blur border-t">
          <form
            onSubmit={sendMessage}
            className={`mx-auto w-full ${CONTENT_MAX} px-4 py-3 flex flex-col gap-2`}
            style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
          >
            <input
              ref={attachInputRef}
              type="file"
              multiple
              accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/csv"
              className="hidden"
              onChange={onAttachInput}
            />

            {!!attachedImages.length && (
              <div className="flex gap-2 overflow-x-auto">
                {attachedImages.map((src, i) => (
                  <div key={i} className="relative">
                    <img src={src} alt={`attachment-${i}`} className="w-20 h-20 object-cover rounded border" />
                    <button
                      type="button"
                      className="absolute -top-2 -right-2 bg-black/70 text-white rounded-full w-5 h-5"
                      onClick={() => removeImage(i)}
                      aria-label="Remove image"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <IconButton
                  label="Attach"
                  onClick={() => {
                    const u = loadUsage();
                    if (u.imagesSent >= MONTHLY_IMAGE_LIMIT) {
                      alert(`Monthly image limit reached (${MONTHLY_IMAGE_LIMIT}).`);
                      return;
                    }
                    attachInputRef.current?.click();
                  }}
                >
                  <span role="img" aria-hidden>
                    📎
                  </span>
                </IconButton>
              </div>

              <input
                id="mp-composer"
                className="flex-1 min-w-0 rounded-xl border border-gray-300 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="How can I help you?"
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={
                    loading ||
                    (input.trim().length === 0 && attachedImages.length === 0) ||
                    usage.messagesSent >= MONTHLY_MESSAGE_LIMIT ||
                    usage.imagesSent + attachedImages.length > MONTHLY_IMAGE_LIMIT
                  }
                  className="rounded-xl px-5 py-2 bg-blue-600 text-white font-semibold disabled:opacity-50 hover:bg-blue-700"
                >
                  Send
                </button>

                <div data-usage-popover-root="true" className="relative">
                  <button
                    type="button"
                    aria-label="Usage info"
                    className="h-10 w-10 grid place-items-center rounded-xl border bg-white hover:bg-gray-50 text-gray-700"
                    aria-pressed={usagePopoverOpen}
                    onClick={() => setUsagePopoverOpen((v) => !v)}
                  >
                    ℹ️
                  </button>

                  {usagePopoverOpen && (
                    <div className="absolute bottom-12 right-0 w-64 rounded-xl border bg-white shadow-lg p-3 text-xs text-gray-700">
                      <div className="font-semibold text-gray-900 mb-1">This month remaining</div>
                      <div>Messages left: {messagesRemaining}</div>
                      <div>Images left: {imagesRemaining}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}