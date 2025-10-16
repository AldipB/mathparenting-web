// src/app/courses/local/[grade]/[lessonSlug]/page.tsx
import { promises as fs } from "fs";
import path from "path";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

export const revalidate = 60;

type Params = { grade: string; lessonSlug: string };

function titleCaseFromSlug(s: string) {
  return s
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function pick<T extends object, K extends keyof T>(obj: T | null | undefined, keys: K[]): Partial<T> {
  const out = {} as Partial<T>;
  if (!obj) return out;
  for (const k of keys) {
    if (obj[k] != null) out[k] = obj[k];
  }
  return out;
}

/**
 * Normalize common field names so we can render JSONs that
 * use slightly different keys (e.g., core vs coreIdea, demo vs householdDemo).
 */
function normalizeLessonShape(raw: any) {
  const {
    title,
    lessonTitle,
    summary,
    overview,
    parentOverview,
    core,
    coreIdea,
    demo,
    householdDemo,
    math,
    mathBehindIt,
    guide,
    steps,
    practice,
    close,
    positiveClose,
    // optional extras
    formulas,
    mistakes,
    connection,
  } = raw ?? {};

  const norm = {
    title: title ?? lessonTitle ?? "",
    summary: summary ?? "",
    overview: overview ?? parentOverview ?? "",
    core: core ?? coreIdea ?? "",
    demo: demo ?? householdDemo ?? "",
    math: math ?? mathBehindIt ?? "",
    guide: Array.isArray(guide) ? guide.join("\n\n") : guide ?? (Array.isArray(steps) ? steps.join("\n\n") : steps ?? ""),
    practice: Array.isArray(practice) ? practice.join("\n\n") : practice ?? "",
    close: close ?? positiveClose ?? "",
    // optional sections (render only if non-empty)
    formulas: formulas ?? "",
    mistakes: mistakes ?? "",
    connection: connection ?? "",
  };

  return norm;
}

export default async function LocalLessonPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { grade, lessonSlug } = await params;

  const filePath = path.join(
    process.cwd(),
    "content",
    "lessons",
    grade.toLowerCase(),
    `${lessonSlug}.json`
  );

  let rawJson: string;
  try {
    rawJson = await fs.readFile(filePath, "utf8");
  } catch {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="mb-2 text-2xl font-bold">Lesson not found</h1>
        <p className="text-gray-600">
          Couldn’t load <code>{lessonSlug}.json</code> in grade <code>{grade}</code>.
        </p>
      </main>
    );
  }

  let data: any = null;
  try {
    data = JSON.parse(rawJson);
  } catch {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="mb-2 text-2xl font-bold">Invalid lesson file</h1>
        <p className="text-gray-600">The JSON could not be parsed.</p>
      </main>
    );
  }

  const norm = normalizeLessonShape(data);
  const title =
    (norm.title && String(norm.title).trim()) ||
    titleCaseFromSlug(lessonSlug) ||
    "Lesson";

  const optional = pick(norm, ["formulas", "mistakes", "connection"]);

  const sections: Array<{ key: string; label: string; md: string }> = [
    { key: "overview", label: "Parent Overview", md: String(norm.overview ?? "") },
    { key: "core", label: "Core Idea", md: String(norm.core ?? "") },
    { key: "demo", label: "Household Demonstration", md: String(norm.demo ?? "") },
    { key: "math", label: "The Math Behind It", md: String(norm.math ?? "") },
    { key: "formulas", label: "Formula Section", md: String(optional.formulas ?? "") },
    { key: "guide", label: "Step-by-Step Teaching Guide", md: String(norm.guide ?? "") },
    { key: "mistakes", label: "Common Mistakes to Expect", md: String(optional.mistakes ?? "") },
    { key: "connection", label: "Real-Life Connection", md: String(optional.connection ?? "") },
    { key: "practice", label: "Practice Together", md: String(norm.practice ?? "") },
    { key: "close", label: "Positive Close", md: String(norm.close ?? "") },
  ].filter((s) => (s.md || "").trim().length > 0);

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-2 text-3xl font-bold">{title}</h1>
      {norm.summary && <p className="mb-6 text-gray-600">{norm.summary}</p>}

      <div className="space-y-8">
        {sections.map((s) => (
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
    </main>
  );
}
