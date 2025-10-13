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

type ChatMessage = { role: "user" | "assistant"; content: string; ts: number };
type ChatSession = { id: string; title: string; createdAt: number; updatedAt: number };

const SESSIONS_KEY = "mp.sessions.v1";
const MESSAGES_KEY = (id: string) => `mp.messages.${id}.v1`;

function loadSessions(): ChatSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    return raw ? (JSON.parse(raw) as ChatSession[]) : [];
  } catch {
    return [];
  }
}
function saveSessions(sessions: ChatSession[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}
function loadMessages(sessionId: string): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(MESSAGES_KEY(sessionId));
    return raw ? (JSON.parse(raw) as ChatMessage[]) : [];
  } catch {
    return [];
  }
}
function saveMessages(sessionId: string, msgs: ChatMessage[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(MESSAGES_KEY(sessionId), JSON.stringify(msgs));
}
function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
function prettyTime(t: number) {
  return new Date(t).toLocaleString();
}

export default function ChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [logoOk, setLogoOk] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Always start with a brand-new ephemeral session on page load
  const [isEphemeral, setIsEphemeral] = useState<boolean>(true);

  // Double-send protection + simple throttle
  const inflightRef = useRef(false);
  const lastUserRef = useRef<{ text: string; ts: number }>({ text: "", ts: 0 });

  // Highlight-to-Ask state
  const [selText, setSelText] = useState<string>("");
  const [selPos, setSelPos] = useState<{ x: number; y: number } | null>(null);
  const [quoteDraft, setQuoteDraft] = useState<string>("");

  // init: load sessions list, but DO NOT auto-open any old chat
  useEffect(() => {
    const existing = loadSessions();
    setSessions(existing);
    setActiveId(uid());       // fresh chat id
    setIsEphemeral(true);     // empty until first message
    setMessages([]);          // no messages initially
  }, []);

  // load messages only for saved sessions (never for ephemeral new)
  useEffect(() => {
    if (!activeId) return;
    if (isEphemeral) setMessages([]);
    else setMessages(loadMessages(activeId));
  }, [activeId, isEphemeral]);

  // persist saved sessions only
  useEffect(() => {
    if (!activeId || isEphemeral) return;
    saveMessages(activeId, messages);
  }, [activeId, isEphemeral, messages]);

  const hasUserMessage = useMemo(
    () => messages.some((m) => m.role === "user"),
    [messages]
  );
  const showSplash = !hasUserMessage && !loading && input.trim().length === 0;

  // scrolling
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
      endRef.current?.scrollIntoView({ block: "end" });
    });
  }, [messages, loading]);

  function newChat() {
    setActiveId(uid());
    setIsEphemeral(true);
    setMessages([]);
    setInput("");
    setQuoteDraft("");
    setIsSidebarOpen(false);
  }

  function renameChat(id: string) {
    const title = prompt(
      "Rename chat:",
      sessions.find((x) => x.id === id)?.title || ""
    );
    if (title === null) return;
    const next = sessions.map((x) =>
      x.id === id
        ? { ...x, title: title || "Untitled", updatedAt: Date.now() }
        : x
    );
    setSessions(next);
    saveSessions(next);
  }

  function deleteChat(id: string) {
    if (!confirm("Delete this chat? This cannot be undone.")) return;
    const next = sessions.filter((x) => x.id !== id);
    setSessions(next);
    saveSessions(next);
    if (typeof window !== "undefined")
      localStorage.removeItem(MESSAGES_KEY(id));
    if (!next.length) {
      newChat();
    } else {
      setActiveId(next[0].id);
      setIsEphemeral(false);
    }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!activeId) return;

    const typed = input.trim();
    if (!typed && !quoteDraft) return;

    // Compose final message: include quote pill content like ChatGPT
    const finalContent = quoteDraft
      ? `> ${quoteDraft}\n\n${typed || "Can you explain this more clearly in simple steps?"}`
      : typed;

    const now = Date.now();
    // Throttle identical repeats
    if (
      lastUserRef.current.text === finalContent &&
      now - lastUserRef.current.ts < 1500
    ) {
      return;
    }
    if (inflightRef.current || loading) return;
    inflightRef.current = true;
    lastUserRef.current = { text: finalContent, ts: now };

    const userMsg: ChatMessage = { role: "user", content: finalContent, ts: now };
    const nextMsgs = [...messages, userMsg];
    setMessages(nextMsgs);
    setInput("");
    setQuoteDraft(""); // clear the pill after sending
    setLoading(true);

    // If ephemeral, create real session now
    if (isEphemeral) {
      // Title guess ignores the "> quote" lines
      const firstLine = finalContent.replace(/^> .*\n?/gm, "").trim();
      const guess = firstLine.replace(/\s+/g, " ").slice(0, 40);
      const newSession: ChatSession = {
        id: activeId,
        title: guess || "New chat",
        createdAt: now,
        updatedAt: now,
      };
      const updatedSessions = [newSession, ...sessions];
      setSessions(updatedSessions);
      saveSessions(updatedSessions);
      setIsEphemeral(false);
      saveMessages(activeId, nextMsgs);
    } else {
      const updated = sessions.map((s) =>
        s.id === activeId ? { ...s, updatedAt: now } : s
      );
      setSessions(updated);
      saveSessions(updated);
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idempotencyKey: `${activeId}:${now}:${finalContent.slice(0, 64)}`,
          messages: nextMsgs.map(({ role, content }) => ({ role, content })),
        }),
      });
      const data: { reply?: string; error?: string } = await response.json();

      const reply: ChatMessage = {
        role: "assistant",
        content: response.ok
          ? data.reply ?? "Sorry, I couldn't generate a response. Please try again."
          : `⚠️ Error: ${data?.error ?? "Something went wrong."}`,
        ts: Date.now(),
      };

      setMessages((prev) => [...prev, reply]);
      if (!isEphemeral) saveMessages(activeId, [...nextMsgs, reply]);
    } catch {
      const err: ChatMessage = {
        role: "assistant",
        content: "⚠️ Network error. Please try again.",
        ts: Date.now(),
      };
      setMessages((prev) => [...prev, err]);
      if (!isEphemeral) saveMessages(activeId, [...nextMsgs, err]);
    } finally {
      setLoading(false);
      inflightRef.current = false;
    }
  }

  // Highlight-to-Ask detection: show a small button near selection
  useEffect(() => {
    function handleMouseUp() {
      const sel = window.getSelection?.();
      const text = sel?.toString().trim() ?? "";
      if (!text) {
        setSelText("");
        setSelPos(null);
        return;
      }
      // Only trigger for selections inside the chat area
      const range = sel!.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setSelText(text);
      setSelPos({ x: rect.right, y: rect.top + window.scrollY });
    }
    function handleScrollOrResize() {
      setSelText("");
      setSelPos(null);
    }
    document.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, []);

  function askAboutSelection() {
    if (!selText) return;
    // Create a quote pill like ChatGPT instead of inserting into the input directly
    setQuoteDraft(selText);
    setSelText("");
    setSelPos(null);
    const el = document.getElementById("mp-composer") as HTMLInputElement | null;
    el?.focus();
  }

  const hasQuote = quoteDraft.trim().length > 0;

  return (
    <div className="w-full min-h-screen">
      {/* Mobile hamburger (below sticky header h-16) */}
      <button
        className="md:hidden fixed left-3 top-20 z-50 rounded-md border bg-white px-3 py-2 text-sm shadow"
        aria-label="Open history"
        onClick={() => setIsSidebarOpen(true)}
      >
        ☰
      </button>

      {/* Sidebar */}
      <aside
        className={`
          fixed top-16 bottom-0 left-0 z-40 w-64 bg-white border-r
          transform transition-transform duration-300
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0
        `}
      >
        <div className="p-3 border-b flex items-center gap-2">
          <button
            onClick={newChat}
            className="w-full rounded-lg border px-3 py-2 text-sm font-medium bg-white hover:bg-gray-50"
          >
            + New chat
          </button>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden rounded-lg border px-2 py-1 text-xs"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="h-[calc(100svh-4rem-49px)] overflow-y-auto">
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
                <div className="truncate text-sm font-medium">
                  {s.title || "Untitled"}
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      renameChat(s.id);
                    }}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Rename
                  </button>
                  <button
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
              <div className="text-[11px] text-gray-500">{prettyTime(s.updatedAt)}</div>
            </div>
          ))}
        </div>
      </aside>

      {/* Dim overlay when sidebar open on mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main chat column */}
      <div className="relative pt-16 md:pt-16 md:ml-64">
        {/* Scrollable chat panel */}
        <div
          ref={scrollRef}
          className="min-h-[calc(100svh-16rem)] md:min-h-[calc(100svh-12rem)] pb-28 md:pb-32 overflow-y-auto"
        >
          {/* Inner column */}
          <div className="mx-auto w-full max-w-3xl px-4 py-4">
            {/* Splash */}
            {showSplash && (
              <div className="flex items-center justify-center py-24">
                <div className="flex flex-col items-center gap-4 opacity-95">
                  {logoOk ? (
                    <Image
                      src="/logo.png"
                      alt="MathParenting logo"
                      width={96}
                      height={96}
                      className="rounded-2xl shadow"
                      priority
                      onError={() => setLogoOk(false)}
                    />
                  ) : (
                    <div className="h-24 w-24 rounded-2xl shadow grid place-items-center bg-blue-600 text-white text-2xl font-bold">
                      MP
                    </div>
                  )}
                  <div className="text-2xl font-extrabold tracking-tight text-gray-800">MathParenting</div>
                  <p className="text-gray-500 text-sm text-center">
                    Teach any math topic at home with simple steps.
                  </p>
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="flex flex-col space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-full md:max-w-[90%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed shadow ${
                      m.role === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-50 text-gray-900 border border-gray-200"
                    }`}
                  >
                    <ReactMarkdown
                      remarkPlugins={[remarkMath]}
                      rehypePlugins={[rehypeKatex]}
                      components={{
                        h1: (props) => <h1 className="font-bold text-lg mt-4 mb-2" {...props} />,
                        h2: (props) => <h2 className="font-bold text-base mt-3 mb-1" {...props} />,
                        h3: (props) => <h3 className="font-semibold text-base mt-2 mb-1" {...props} />,
                        strong: (props) => <strong className="font-bold text-gray-900" {...props} />,
                        p: (props) => <p className="mb-2 whitespace-pre-wrap leading-relaxed" {...props} />,
                        ul: (props) => <ul className="list-disc pl-5 space-y-1" {...props} />,
                        ol: (props) => <ol className="list-decimal pl-5 space-y-1" {...props} />,
                        li: (props) => <li className="mb-1" {...props} />,
                        blockquote: (props) => (
                          <blockquote
                            className="border-l-4 border-blue-500 pl-3 py-2 bg-blue-50 rounded-md my-2 font-semibold text-gray-700"
                            {...props}
                          />
                        ),
                      }}
                    >
                      {m.content}
                    </ReactMarkdown>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-2xl px-4 py-2 italic text-gray-600 bg-gray-100 shadow">
                    Typing…
                  </div>
                </div>
              )}

              <div ref={endRef} className="h-1" />
            </div>
          </div>
        </div>

        {/* Floating "Ask MathParenting" button near selection */}
        {selText && selPos && (
          <button
            onClick={askAboutSelection}
            className="fixed z-50 rounded-full border bg-white px-3 py-1 text-xs shadow"
            style={{ left: selPos.x + 8, top: selPos.y - 10 }}
            aria-label="Ask MathParenting"
            title="Ask MathParenting"
          >
            Ask MathParenting
          </button>
        )}

        {/* Composer with quote pill like ChatGPT */}
        <div className="fixed bottom-0 right-0 left-0 md:left-64 z-50 bg-white/95 backdrop-blur border-t">
          <form
            onSubmit={sendMessage}
            className="mx-auto w-full max-w-3xl px-4 py-3 flex flex-col gap-2"
            style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
          >
            {hasQuote && (
              <div className="flex items-start gap-2">
                <div className="max-w-full rounded-lg bg-gray-100 border px-3 py-2 text-sm text-gray-800 shadow-sm flex-1">
                  <div className="line-clamp-3">
                    “{quoteDraft}”
                  </div>
                </div>
                <button
                  type="button"
                  className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
                  onClick={() => setQuoteDraft("")}
                  aria-label="Remove quote"
                  title="Remove quote"
                >
                  ✕
                </button>
              </div>
            )}

            <div className="flex gap-2">
              <input
                id="mp-composer"
                className="flex-1 min-w-0 rounded-xl border border-gray-300 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={hasQuote ? "Add a question or just press Send" : "Type your math teaching question…"}
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              <button
                type="submit"
                disabled={loading || (input.trim().length === 0 && !hasQuote)}
                className="rounded-xl px-5 py-2 bg-blue-600 text-white font-semibold disabled:opacity-50 hover:bg-blue-700"
              >
                Send
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
