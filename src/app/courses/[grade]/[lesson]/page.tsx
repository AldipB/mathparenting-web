// src/app/courses/[grade]/[lesson]/page.tsx
import fs from "node:fs";
import path from "node:path";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

export const revalidate = 60;

type LooseLesson = Record<string, unknown>;

function readLesson(grade: string, lesson: string): LooseLesson | null {
  const filePath = path.join(process.cwd(), "public", "lessons", grade.toLowerCase(), `${lesson}.json`);
  if (!fs.existsSync(filePath)) return null;
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw) as LooseLesson;
  } catch {
    return null;
  }
}

function titleCaseFromSlug(slug: string) {
  return slug
    .split("-")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ""))
    .join(" ");
}

function pickString(obj: LooseLesson, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj?.[k];
    if (typeof v === "string" && v.trim()) return v;
  }
  return undefined;
}

export default async function LessonPage(props: { params: Promise<{ grade: string; lesson: string }> }) {
  const { grade, lesson } = await props.params; // ✅ Next 15 promise-params
  const data = readLesson(grade, lesson);
  if (!data) return notFound();

  const title =
    (typeof data.title === "string" && data.title.trim()) ||
    titleCaseFromSlug(lesson);

  // Try common markdown fields for a main body
  const primaryMd = pickString(data, [
    "markdown",
    "content",
    "body",
    "overview",
    "core",
    "demo",
    "math",
    "guide",
    "practice",
  ]);

  // Collect section-like fields for nicer layout (optional)
  const sectionLabels: Record<string, string> = {
    objectives: "Learning Objectives",
    overview: "Parent Overview",
    core: "Core Idea",
    demo: "Household Demonstration",
    math: "The Math Behind It",
    formulas: "Formulas",
    guide: "Step-by-Step Guide",
    mistakes: "Common Mistakes",
    connection: "Real-Life Connection",
    practice: "Practice Together",
    close: "Positive Close",
  };

  const sections: Array<{ key: string; label: string; md: string }> = [];
  for (const key of Object.keys(sectionLabels)) {
    const v = data[key];
    if (typeof v === "string" && v.trim()) {
      sections.push({ key, label: sectionLabels[key], md: v });
    }
  }

  // If your JSON has `sections: [{title, markdown}]`, include them too
  if (Array.isArray((data as any).sections)) {
    for (const s of (data as any).sections) {
      const md =
        (typeof s?.markdown === "string" && s.markdown) ||
        (typeof s?.content === "string" && s.content);
      const lab =
        (typeof s?.title === "string" && s.title) ||
        (typeof s?.key === "string" && s.key);
      if (md && lab) sections.push({ key: lab, label: lab, md });
    }
  }

  // De-dupe by label
  const seen = new Set<string>();
  const uniqueSections = sections.filter((s) => {
    const k = s.label.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-2 text-3xl font-bold">{title}</h1>
      <p className="mb-6 text-gray-500">
        {grade.toLowerCase() === "k" ? "Kindergarten" : `Grade ${grade}`} •{" "}
        <code className="rounded bg-gray-100 px-1 py-0.5">{lesson}.json</code>
      </p>

      {primaryMd && (
        <article className="prose max-w-none mb-8">
          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
            {primaryMd}
          </ReactMarkdown>
        </article>
      )}

      {uniqueSections.length > 0 && (
        <div className="space-y-8">
          {uniqueSections.map((s) => (
            <section key={s.key}>
              <h2 className="mb-2 text-xl font-semibold">{s.label}</h2>
              <article className="prose max-w-none">
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                  {s.md}
                </ReactMarkdown>
              </article>
            </section>
          ))}
        </div>
      )}

      {!primaryMd && uniqueSections.length === 0 && (
        <pre className="mt-6 overflow-x-auto rounded-xl border p-4 text-sm">
{JSON.stringify(data, null, 2)}
        </pre>
      )}
    </main>
  );
}
