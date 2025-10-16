// src/app/courses/[grade]/[unitId]/[lessonSlug]/page.tsx
import fs from "fs";
import path from "path";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import Image from "next/image";

export const revalidate = 60;

// Display order / labels for expected sections in your JSON
const LABELS: Record<string, string> = {
  objectives: "Learning Objectives",
  overview: "Parent Overview",
  core: "Core Idea",
  demo: "Household Demonstration",
  math: "The Math Behind It",
  formulas: "Formula",
  guide: "Step-by-Step Teaching Guide",
  mistakes: "Common Mistakes",
  connection: "Real-Life Connection",
  practice: "Practice Together",
  close: "Positive Close",
  // fallback: any additional keys render too
};

const ORDER = [
  "objectives",
  "overview",
  "core",
  "demo",
  "math",
  "formulas",
  "guide",
  "mistakes",
  "connection",
  "practice",
  "close",
];

function normalizeGrade(raw: string) {
  const s = decodeURIComponent(raw).trim().toLowerCase();
  if (s === "k" || s === "kg" || s === "kindergarten" || s === "0") return "k";
  if (/^(?:grade|g)[-\s]?(\d{1,2})$/.test(s)) return String(Number(RegExp.$1));
  if (/^\d{1,2}$/.test(s)) return String(Number(s));
  return s;
}

function splitFirstImage(md?: string) {
  if (!md) return { img: null as null | { alt: string; src: string }, rest: "" };
  const imgRE = /!\[([^\]]*)\]\(([^)]+)\)/;
  const m = md.match(imgRE);
  if (!m) return { img: null, rest: md };
  const alt = m[1] || "";
  const src = m[2] || "";
  const rest = md.replace(imgRE, "").trim();
  return { img: { alt, src }, rest };
}

type LessonJSON = {
  title?: string;
  summary?: string;
  sections?: Record<string, string>;
  practice?: Array<{
    order_index?: number;
    question_md: string;
    hint_md?: string;
    answer_md?: string;
  }>;
  // tolerate other shapes too
  [k: string]: any;
};

function loadLessonJSON(gradeSlug: string, lessonSlug: string): LessonJSON | null {
  const file = path.join(process.cwd(), "public", "lessons", gradeSlug, `${lessonSlug}.json`);
  if (!fs.existsSync(file)) return null;
  try {
    const raw = fs.readFileSync(file, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default async function LessonPage({
  params,
}: {
  // Next 15: params is async
  params: Promise<{ grade: string; unitId: string; lessonSlug: string }>;
}) {
  const { grade, lessonSlug } = await params;
  const gradeSlug = normalizeGrade(grade);

  const data = loadLessonJSON(gradeSlug, lessonSlug);
  if (!data) return notFound();

  const title =
    data.title ??
    lessonSlug
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (c: string) => c.toUpperCase());

  const summary: string | undefined = data.summary;

  // The content might be under `sections` or flat keys; normalize to entries
  const entries: Array<{ key: string; md: string; order: number }> = [];

  if (data.sections && typeof data.sections === "object") {
    for (const [k, v] of Object.entries<string>(data.sections)) {
      if (!v || !v.trim()) continue;
      const order = ORDER.indexOf(k);
      entries.push({ key: k, md: v, order: order === -1 ? 999 : order });
    }
  } else {
    // scan top-level keys for markdown strings
    for (const [k, v] of Object.entries<any>(data)) {
      if (typeof v === "string" && v.trim().length) {
        const order = ORDER.indexOf(k);
        entries.push({ key: k, md: v, order: order === -1 ? 999 : order });
      }
    }
  }

  entries.sort((a, b) => (a.order !== b.order ? a.order - b.order : a.key.localeCompare(b.key)));

  // practice block (array)
  const practice = Array.isArray(data.practice)
    ? (data.practice as LessonJSON["practice"]).slice().sort((a, b) => {
        const ia = a.order_index ?? 0;
        const ib = b.order_index ?? 0;
        return ia - ib;
      })
    : [];

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-2 text-3xl font-bold">{title}</h1>
      {summary && <p className="mb-6 text-gray-600">{summary}</p>}

      <div className="space-y-8">
        {entries.map((s) => {
          if (s.key === "demo") {
            const { img, rest } = splitFirstImage(s.md);
            return (
              <section key={s.key}>
                <h2 className="mb-2 text-xl font-semibold">
                  {LABELS[s.key] ?? s.key}
                </h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                  <article className={img ? "prose max-w-none md:col-span-3" : "prose max-w-none md:col-span-5"}>
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {img ? rest : s.md}
                    </ReactMarkdown>
                  </article>
                  {img && (
                    <aside className="md:col-span-2">
                      {/* If the image src is under /public, use next/image for optimization */}
                      {img.src.startsWith("/") ? (
                        <Image
                          src={img.src}
                          alt={img.alt || "Lesson example"}
                          width={800}
                          height={600}
                          className="h-auto w-full rounded-xl border object-cover"
                        />
                      ) : (
                        <img
                          src={img.src}
                          alt={img.alt || "Lesson example"}
                          className="w-full rounded-xl border object-cover"
                        />
                      )}
                      {img.alt && <div className="mt-1 text-xs text-gray-500">{img.alt}</div>}
                    </aside>
                  )}
                </div>
              </section>
            );
          }
          return (
            <section key={s.key}>
              <h2 className="mb-2 text-xl font-semibold">{LABELS[s.key] ?? s.key}</h2>
              <article className="prose max-w-none">
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                  {s.md}
                </ReactMarkdown>
              </article>
            </section>
          );
        })}

        {practice.length > 0 && (
          <section>
            <h2 className="mb-2 text-xl font-semibold">Practice Together</h2>
            <ol className="ml-6 list-decimal space-y-4">
              {practice.map((p, idx) => (
                <li key={(p.order_index ?? idx) + "-" + idx}>
                  <div className="prose max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {p.question_md}
                    </ReactMarkdown>
                    {p.hint_md && (
                      <details className="mt-1">
                        <summary className="cursor-pointer underline">Hint</summary>
                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                          {p.hint_md}
                        </ReactMarkdown>
                      </details>
                    )}
                    {p.answer_md && (
                      <details className="mt-1">
                        <summary className="cursor-pointer underline">Answer</summary>
                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                          {p.answer_md}
                        </ReactMarkdown>
                      </details>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </main>
  );
}
