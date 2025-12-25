// src/app/chat/ChatPageClient.tsx
"use client";

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useLayoutEffect,
} from "react";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
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

const isClient = typeof window !== "undefined";

const uid = () =>
  Math.random().toString(36).slice(2) + Date.now().toString(36);

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
/* Simple graph renderer for math plots                               */
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
  const hasBounds = ["xMin", "xMax", "yMin", "yMax"].every(
    (k) => typeof o[k] === "number"
  );
  const hasSeries =
    Array.isArray(o.lines) ||
    Array.isArray(o.points) ||
    Array.isArray(o.functions) ||
    Array.isArray(o.segments);
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
  const cfg: Required<
    Pick<GraphSpec, "xMin" | "xMax" | "yMin" | "yMax">
  > &
    GraphSpec = {
    xMin: spec.xMin ?? -10,
    xMax: spec.xMax ?? 10,
    yMin: spec.yMin ?? -10,
    yMax: spec.yMax ?? 10,
    ...spec,
  };
  const W = 640;
  const H = 400;

  const xToSvg = (x: number) =>
    ((x - cfg.xMin) / (cfg.xMax - cfg.xMin)) * W;
  const yToSvg = (y: number) =>
    H - ((y - cfg.yMin) / (cfg.yMax - cfg.yMin)) * H;

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
              return (
                <line
                  key={"gv" + i}
                  x1={X}
                  y1={0}
                  x2={X}
                  y2={H}
                  stroke="#eef2ff"
                  strokeWidth={1}
                />
              );
            })}
            {Array.from({ length: tickN + 1 }, (_, i) => {
              const Y = yToSvg(cfg.yMin + i * yStep);
              return (
                <line
                  key={"gh" + i}
                  x1={0}
                  y1={Y}
                  x2={W}
                  y2={Y}
                  stroke="#eef2ff"
                  strokeWidth={1}
                />
              );
            })}
          </>
        )}

        {cfg.axis && (
          <>
            {cfg.xMin < 0 && cfg.xMax > 0 && (
              <line
                x1={xToSvg(0)}
                y1={0}
                x2={xToSvg(0)}
                y2={H}
                stroke="#6b7280"
                strokeWidth={1.5}
              />
            )}
            {cfg.yMin < 0 && cfg.yMax > 0 && (
              <line
                x1={0}
                y1={yToSvg(0)}
                x2={W}
                y2={yToSvg(0)}
                stroke="#6b7280"
                strokeWidth={1.5}
              />
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
          <path
            key={"fn" + i}
            d={d}
            fill="none"
            stroke="#10b981"
            strokeWidth={2}
          />
        ))}

        {cfg.points?.map((p, i) => (
          <g key={"pt" + i}>
            <circle
              cx={xToSvg(p.x)}
              cy={yToSvg(p.y)}
              r={4}
              fill="#ef4444"
            />
            {p.label && (
              <text
                x={xToSvg(p.x) + 6}
                y={yToSvg(p.y) - 6}
                fontSize={12}
                fill="#374151"
              >
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
/* Text clean and section titles                                      */
/* ------------------------------------------------------------------ */

const collapseRepeatedWords = (t: string) =>
  t.replace(/\b(\w+)(\s+\1\b)+/gi, "$1");

function balanceKatex(text: string): string {
  let out = text
    .replace(/\\\(\s*([\s\S]*?)\s*\\\)/g, (_m, g) => `$ ${g} $`)
    .replace(/\\\[\s*([\s\S]*?)\s*\\\]/g, (_m, g) => `$$ ${g} $$`);

  const dollars = (out.match(/\$/g) || []).length;
  if (dollars % 2 === 1) {
    out = out.replace(/\$(?![\s\S]*\$)[\s]*$/m, "");
  }

  out = out
    .replace(/\s*[,;)]\s*[,;)]\s*/g, ", ")
    .replace(/[),]\s*[),]\s*/g, ") ");

  return out;
}

function sanitizeNoEmDash(text: string) {
  return text.replace(/\u2014|\u2013/g, "-");
}

const SECTION_TITLES = [
  "🧠 Core Idea",
  "🏠 Household Demonstration",
  "👨‍👩‍👧 Step-by-Step Teaching Guide",
  "👨‍👩‍👧 Step by Step Teaching Guide",
  "🧩 Practice Together",
  "💬 Parent Tip",
];

/* ------------------------------------------------------------------ */
/* Markdown components and details splitter                           */
/* ------------------------------------------------------------------ */

function CodeRenderer(props: {
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  const { inline, className, children } = props;
  const lang = (className || "")
    .replace("language-", "")
    .trim()
    .toLowerCase();
  const raw = String(children ?? "").trim();

  if (!inline) {
    if (lang === "graph" || lang === "json" || lang === "") {
      const obj = parseJsonObject(raw);
      if (obj && looksLikeGraphSpec(obj)) {
        return <Graph spec={obj} />;
      }
    }
    const fallback = parseJsonObject(raw);
    if (fallback && looksLikeGraphSpec(fallback)) {
      return <Graph spec={fallback} />;
    }
  }

  return (
    <pre className="overflow-x-auto rounded-md bg-gray-900 text-gray-100 p-3 text-sm">
      <code className={className}>{raw}</code>
    </pre>
  );
}

const markdownComponents = {
  h1: (p: any) => (
    <h1 className="font-bold text-lg mt-4 mb-2" {...p} />
  ),
  h2: (p: any) => (
    <h2 className="font-bold text-base mt-3 mb-1" {...p} />
  ),
  h3: (p: any) => (
    <h3 className="font-semibold text-base mt-2 mb-1" {...p} />
  ),
  strong: (p: any) => (
    <strong className="font-bold text-gray-900" {...p} />
  ),
  p: ({ children }: any) => {
    const raw = String(children ?? "");
    const stripped = raw.replace(/\s+/g, " ").trim();
    const isSectionTitle = SECTION_TITLES.some((title) =>
      stripped.startsWith(title)
    );
    const cls =
      "mb-2 whitespace-pre-wrap leading-relaxed" +
      (isSectionTitle ? " font-bold" : "");
    return <p className={cls}>{children}</p>;
  },
  ul: (p: any) => <ul className="list-disc pl-5 space-y-1" {...p} />,
  ol: (p: any) => <ol className="list-decimal pl-5 space-y-1" {...p} />,
  li: (p: any) => <li className="mb-1" {...p} />,
  blockquote: (p: any) => (
    <blockquote
      className="border-l-4 border-blue-500 pl-3 py-2 bg-blue-50 rounded-md my-2 font-semibold text-gray-700"
      {...p}
    />
  ),
  code: CodeRenderer,
};

function renderMarkdownWithDetails(text: string) {
  const elements: React.ReactNode[] = [];

  const regex =
    /<details[^>]*>\s*<summary[^>]*>\s*Answer\s*<\/summary>\s*([\s\S]*?)<\/details>/gi;

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let idx = 0;

  while ((match = regex.exec(text)) !== null) {
    const [fullMatch, inner] = match;

    if (match.index > lastIndex) {
      const before = text.slice(lastIndex, match.index);
      if (before.trim()) {
        elements.push(
          <ReactMarkdown
            key={"mp-md-before-" + idx}
            remarkPlugins={[remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={markdownComponents}
          >
            {before}
          </ReactMarkdown>
        );
      }
    }

    elements.push(
      <details
        key={"mp-details-" + idx}
        className="my-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2"
      >
        <summary className="cursor-pointer font-semibold text-gray-800">
          Answer
        </summary>
        <div className="mt-2">
          <ReactMarkdown
            remarkPlugins={[remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={markdownComponents}
          >
            {inner.trim()}
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
          rehypePlugins={[rehypeKatex]}
          components={markdownComponents}
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
        rehypePlugins={[rehypeKatex]}
        components={markdownComponents}
      >
        {text}
      </ReactMarkdown>
    );
  }

  return elements;
}

/* ------------------------------------------------------------------ */
/* Image and audio helpers                                            */
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

async function ttsSpeak(text: string) {
  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) return;
    const buf = await res.arrayBuffer();
    const blob = new Blob([buf], { type: "audio/mpeg" });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    await audio.play();
  } catch {}
}

/* ------------------------------------------------------------------ */
/* Small icon button                                                  */
/* ------------------------------------------------------------------ */

function IconButton({
  label,
  onClick,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  onPointerLeave,
  pressed,
  disabled,
  children,
}: React.PropsWithChildren<{
  label: string;
  onClick?: () => void;
  onPointerDown?: (e: React.PointerEvent) => void;
  onPointerUp?: (e: React.PointerEvent) => void;
  onPointerCancel?: (e: React.PointerEvent) => void;
  onPointerLeave?: (e: React.PointerEvent) => void;
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
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onPointerLeave={onPointerLeave}
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
/* Main chat page                                                     */
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
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingGuardRef = useRef(false);
  const [voiceReply, setVoiceReply] = useState(false);
  const attachInputRef = useRef<HTMLInputElement>(null);

  const [extractedQuestions, setExtractedQuestions] = useState<ExtractedQuestion[]>([]);

  useEffect(() => {
    setSessions(loadSessions());
    const id = uid();
    setActiveId(id);
    setIsEphemeral(true);
    setMessages([]);
    setExtractedQuestions([]);
  }, []);

  useEffect(() => {
    if (activeId) {
      setExtractedQuestions(loadExtracted(activeId));
    }
  }, [activeId]);

  useEffect(() => {
    if (activeId && !isEphemeral) {
      setMessages(loadMessages(activeId));
    }
  }, [activeId, isEphemeral]);

  useEffect(() => {
    if (activeId && !isEphemeral) {
      saveMessages(activeId, messages);
    }
  }, [activeId, isEphemeral, messages]);

  const hasUser = useMemo(
    () => messages.some((m) => m.role === "user"),
    [messages]
  );
  const showSplash =
    !hasUser && !loading && input.trim().length === 0;

  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop =
          scrollRef.current.scrollHeight;
      }
      endRef.current?.scrollIntoView({ block: "end" });
    });
  }, [messages, loading]);

  useEffect(() => {
    return () => {
      try {
        if (mediaRecorderRef.current?.state === "recording") {
          mediaRecorderRef.current.stop();
        }
      } catch {}
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function newChat() {
    const id = uid();
    setActiveId(id);
    setIsEphemeral(true);
    setMessages([]);
    setInput("");
    setIsSidebarOpen(false);
    setAttachedImages([]);
    setExtractedQuestions([]);
    clearExtracted(id);
  }

  function renameChat(id: string) {
    const title = prompt(
      "Rename chat:",
      sessions.find((s) => s.id === id)?.title || ""
    );
    if (title === null) return;
    const next = sessions.map((s) =>
      s.id === id
        ? {
            ...s,
            title: title.trim() || "Untitled",
            updatedAt: Date.now(),
          }
        : s
    );
    setSessions(next);
    saveSessions(next);
  }

  function deleteChat(id: string) {
    if (!confirm("Delete this chat? This cannot be undone.")) {
      return;
    }
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

  async function onAttachInput(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    for (const file of files) {
      const isImage = (file.type || "").startsWith("image/");
      if (isImage) {
        const base64 = await fileToBase64(file);
        setAttachedImages((prev) => [...prev, base64]);
      } else {
        const fd = new FormData();
        fd.append("file", file, file.name);
        try {
          const r = await fetch("/api/filetext", {
            method: "POST",
            body: fd,
          });
          const j = await r.json();
          if (j?.kind === "text" && j.text) {
            const snippet = j.text.trim();
            const header = `\n\n[From ${j.name}]\n`;
            setInput((prev) =>
              prev ? prev + header + snippet : header + snippet
            );
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

    e.currentTarget.value = "";
  }

  function removeImage(idx: number) {
    setAttachedImages((prev) =>
      prev.filter((_, i) => i !== idx)
    );
  }

  async function startRecording() {
    if (recordingGuardRef.current || isRecording) return;
    recordingGuardRef.current = true;
    try {
      const stream =
        await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });
      audioChunksRef.current = [];
      mr.ondataavailable = (ev) => {
        if (ev.data.size) audioChunksRef.current.push(ev.data);
      };
      mr.onstop = async () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        const blob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        const fd = new FormData();
        fd.append("audio", blob, "speech.webm");
        try {
          const r = await fetch("/api/stt", {
            method: "POST",
            body: fd,
          });
          const j = await r.json().catch(() => ({}));
          if (j?.text) setInput(j.text);
        } catch {}
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setIsRecording(true);
    } finally {
      setTimeout(() => {
        recordingGuardRef.current = false;
      }, 0);
    }
  }

  function stopRecording() {
    if (!isRecording) return;
    try {
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    } finally {
      mediaRecorderRef.current = null;
      setIsRecording(false);
    }
  }

  async function ttsIfNeeded(text: string) {
    if (!voiceReply || !text.trim()) return;
    try {
      await ttsSpeak(text);
    } catch {}
  }

  async function sendMessage(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();
    if (inflightRef.current || loading) return;

    const content = input.trim();
    if ((!content && attachedImages.length === 0) || !activeId) return;

    inflightRef.current = true;
    setLoading(true);

    const now = Date.now();
    const userVisible =
      content || (attachedImages.length ? "_[Sent a photo]_" : "");
    const userMsg: ChatMessage = {
      id: uid(),
      role: "user",
      content: userVisible,
      ts: now,
    };
    const phId = uid();
    const placeholder: ChatMessage = {
      id: phId,
      role: "assistant",
      content: "",
      ts: Date.now(),
      placeholder: true,
    };

    setMessages((prev) => [...prev, userMsg, placeholder]);
    const imagesToSend = [...attachedImages];
    setAttachedImages([]);
    setInput("");

    if (isEphemeral) {
      const card: ChatSession = {
        id: activeId,
        title:
          (content || "New chat")
            .replace(/\s+/g, " ")
            .slice(0, 40) || "New chat",
        createdAt: now,
        updatedAt: now,
      };
      const updated = [card, ...sessions];
      setSessions(updated);
      saveSessions(updated);
      setIsEphemeral(false);
      saveMessages(activeId, [...messages, userMsg, placeholder]);
    } else {
      const updated = sessions.map((s) =>
        s.id === activeId ? { ...s, updatedAt: now } : s
      );
      setSessions(updated);
      saveSessions(updated);
    }

    try {
      const history = [...messages, userMsg].map(
        ({ id, ts, placeholder: _ph, ...rest }) => rest
      );
      const lastIdx = history.length - 1;
      const lastUser = history[lastIdx];
      const parts: any[] = [];
      if (content) parts.push({ type: "text", text: content });
      for (const dataUrl of imagesToSend) {
        parts.push({ type: "image_url", image_url: dataUrl });
      }
      (history as any)[lastIdx] = {
        ...lastUser,
        contentParts: parts.length ? parts : undefined,
      };

      const historyToSend: any[] = [...history];

      if (extractedQuestions.length) {
        historyToSend.push({
          role: "system",
          content:
            "[MP_EXTRACTED_QUESTIONS] " +
            JSON.stringify({ questions: extractedQuestions }),
        });
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({ messages: historyToSend }),
      });
      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let sawDone = false;
      let fullAssistant = "";

      const updatePlaceholder = (delta: string) => {
        fullAssistant += delta;
        setMessages((prev) => {
          const copy = [...prev];
          const i = copy.findIndex((m) => m.id === phId);
          if (i >= 0) {
            copy[i] = {
              ...copy[i],
              content: copy[i].content + delta,
            };
          }
          return copy;
        });
      };

      const finalize = async () => {
        setMessages((prev) => {
          const copy = [...prev];
          const i = copy.findIndex((m) => m.id === phId);
          if (i >= 0) {
            copy[i] = {
              ...copy[i],
              placeholder: false,
              content: sanitizeNoEmDash(
                balanceKatex(
                  collapseRepeatedWords(copy[i].content)
                )
              ),
            };
          }
          return copy;
        });

        if (activeId) {
          let snap: ChatMessage[] = [];
          setMessages((p) => ((snap = p), p));
          saveMessages(activeId, snap);
        }

        await ttsIfNeeded(fullAssistant);
      };

      const handleChunk = (chunk: string) => {
        buffer += chunk;
        const packets = buffer.split(/\r?\n\r?\n/);
        buffer = packets.pop() ?? "";
        for (const pkt of packets) {
          const lines = pkt
            .split(/\r?\n/)
            .filter((l) => l.startsWith("data:"));
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
              const t =
                typeof evt.t === "string" ? evt.t : "";
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
        handleChunk(
          decoder.decode(value, { stream: true })
        );
      }
      if (buffer) handleChunk(buffer);
      if (!sawDone) {
        await finalize();
      }
    } catch {
      setMessages((prev) => {
        const copy = [...prev];
        const i = copy.findIndex((m) => m.id === phId);
        const msg: ChatMessage = {
          id: uid(),
          role: "assistant",
          content: "⚠️ Stream error. Please try again.",
          ts: Date.now(),
        };
        if (i >= 0) copy[i] = msg;
        else copy.push(msg);
        return copy;
      });
    } finally {
      setLoading(false);
      inflightRef.current = false;
    }
  }

  return (
    <div className="w-full min-h-screen bg-slate-50">
      {/* sidebar button for mobile */}
      <button
        type="button"
        className="md:hidden fixed left-3 top-20 z-50 rounded-md border bg-white px-3 py-2 text-sm shadow"
        aria-label="Open history"
        onClick={() => setIsSidebarOpen(true)}
      >
        ☰
      </button>

      {/* sidebar */}
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
                s.id === activeId && !isEphemeral
                  ? "bg-blue-50"
                  : "hover:bg-gray-50"
              }`}
              onClick={() => {
                setActiveId(s.id);
                setIsEphemeral(false);
                setIsSidebarOpen(false);
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="truncate text-sm font-medium">
                  {s.title || "Untitled"}
                </div>
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
              <div className="text-[11px] text-gray-500">
                {pretty(s.updatedAt)}
              </div>
            </div>
          ))}
        </div>

        <div className="p-3 border-t">
          <button
            type="button"
            onClick={() => {
              if (
                !confirm(
                  "Clear all chat history? This cannot be undone."
                )
              )
                return;
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

      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* main column */}
      <div className="relative pt-16 md:pt-16 md:ml-64">
        <div
          ref={scrollRef}
          className="min-h-[calc(100svh-16rem)] md:min-h-[calc(100svh-12rem)] pb-28 md:pb-36 overflow-y-auto"
        >
          <div className="mx-auto w-full max-w-3xl px-4 py-4">
            {/* small header inside chat area */}
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  MathParenting
                </h1>
                <p className="text-xs text-gray-500">
                  Ask about any K to 12 math topic and how to teach it at home.
                </p>
              </div>
            </div>

            {showSplash && (
              <div className="flex items-center justify-center py-16">
                <div className="flex flex-col items-center gap-4 opacity-95">
                  <Image
                    src="/logo.png"
                    alt="MathParenting logo"
                    width={96}
                    height={96}
                    className="rounded-2xl shadow"
                    priority
                    onError={() => setLogoOk(false)}
                  />
                  {!logoOk && (
                    <div className="h-24 w-24 rounded-2xl shadow grid place-items-center bg-blue-600 text-white text-2xl font-bold">
                      MP
                    </div>
                  )}
                  <div className="text-2xl font-extrabold tracking-tight text-gray-800">
                    MathParenting
                  </div>
                  <p className="text-gray-500 text-sm text-center max-w-sm">
                    Teach any K to 12 math topic at home with simple clear steps for you as the parent.
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-col space-y-3">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${
                    m.role === "user"
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-full md:max-w-[90%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed shadow ${
                      m.role === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-50 text-gray-900 border border-gray-200"
                    }`}
                  >
                    {renderMarkdownWithDetails(
                      m.content || (m.placeholder ? "Typing…" : "")
                    )}
                  </div>
                </div>
              ))}
              <div ref={endRef} className="h-1" />
            </div>
          </div>
        </div>

        {/* composer */}
        <div className="fixed bottom-0 right-0 left-0 md:left-64 z-50 bg-white/95 backdrop-blur border-t">
          <form
            onSubmit={sendMessage}
            className="mx-auto w-full max-w-3xl px-4 py-3 flex flex-col gap-2"
            style={{
              paddingBottom:
                "max(0.75rem, env(safe-area-inset-bottom))",
            }}
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
                    <img
                      src={src}
                      alt={`attachment-${i}`}
                      className="w-20 h-20 object-cover rounded border"
                    />
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
                  onClick={() => attachInputRef.current?.click()}
                >
                  <span role="img" aria-hidden>
                    📎
                  </span>
                </IconButton>

                <IconButton
                  label="Hold to speak"
                  pressed={isRecording}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    startRecording();
                  }}
                  onPointerUp={(e) => {
                    e.preventDefault();
                    stopRecording();
                  }}
                  onPointerCancel={(e) => {
                    e.preventDefault();
                    stopRecording();
                  }}
                  onPointerLeave={(e) => {
                    e.preventDefault();
                    stopRecording();
                  }}
                >
                  <span role="img" aria-hidden>
                    🎙️
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

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={voiceReply}
                    onChange={(e) =>
                      setVoiceReply(e.target.checked)
                    }
                  />
                  <span className="hidden sm:inline">
                    Voice replies
                  </span>
                  <span
                    className="sm:hidden"
                    title="Voice replies"
                  >
                    🔊
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={
                    loading ||
                    (input.trim().length === 0 &&
                      attachedImages.length === 0)
                  }
                  className="rounded-xl px-5 py-2 bg-blue-600 text-white font-semibold disabled:opacity-50 hover:bg-blue-700"
                >
                  Send
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
