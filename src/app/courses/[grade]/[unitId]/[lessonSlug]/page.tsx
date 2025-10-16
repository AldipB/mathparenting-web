// src/app/courses/[grade]/[unitId]/[lessonSlug]/page.tsx
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

// labels + order (no formula_glossary)
const LABELS: Record<string, string> = {
  objectives: "Learning Objectives (Why it matters)",
  overview: "Parent Overview",
  core: "Core Idea",
  demo: "Household Demonstration",
  math: "The Math Behind It",
  formulas: "Formula Section",
  guide: "Step-by-Step Teaching Guide",
  mistakes: "Common Mistakes to Expect",
  connection: "Real-Life Connection",
  practice: "Practice Together",
  close: "Positive Close",
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

export const revalidate = 60;

const isPlaceholderFormula = (s: string) =>
  !s?.trim() ||
  /^>\s*If this topic uses formulas/i.test(s) ||
  /^\*\*Key formula/i.test(s) ||
  /^_\(/i.test(s);

// basic slugify fallback (lowercase, hyphens)
function slugify(s: string) {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// pull first markdown image if present
function splitFirstImage(md: string) {
  const imgRE = /!\[([^\]]*)\]\(([^)]+)\)/;
  const m = md?.match(imgRE);
  if (!m) return { img: null as null | { alt: string; src: string }, rest: md };
  const alt = m[1] || "";
  const src = m[2] || "";
  const rest = md.replace(imgRE, "").trim();
  return { img: { alt, src }, rest };
}

export default async function LessonPage({
  params,
}: {
  params: { grade: string; unitId: string; lessonSlug: string };
}) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // 1) grade sanity (optional, but keeps URLs clean)
  const { data: grade } = await supabase
    .from("grades")
    .select("id, slug, name")
    .eq("slug", params.grade.toLowerCase())
    .maybeSingle();
  if (!grade) return notFound();

  // 2) try to find the lesson by (unit_id, slug)
  let { data: lesson } = await supabase
    .from("lessons")
    .select("id, title, summary, unit_id, slug")
    .eq("unit_id", params.unitId)
    .eq("slug", params.lessonSlug)
    .maybeSingle();

  // 3) fallback: find by unit_id and compare a derived slug from title
  if (!lesson) {
    const { data: inUnit } = await supabase
      .from("lessons")
      .select("id, title, summary, unit_id, slug")
      .eq("unit_id", params.unitId);

    const derivedMatch = (inUnit || []).find(
      (L) => slugify(L.title) === params.lessonSlug.toLowerCase()
    );
    if (derivedMatch) {
      lesson = derivedMatch;
    }
  }
  if (!lesson) return notFound();

  // 4) sections + practice
  const [{ data: sections }, { data: practice }] = await Promise.all([
    supabase
      .from("lesson_sections")
      .select("section_key, markdown_content, order_index")
      .eq("lesson_id", lesson.id),
    supabase
      .from("practice_problems")
      .select("order_index, question_md, hint_md, answer_md")
      .eq("lesson_id", lesson.id)
      .order("order_index", { ascending: true }),
  ]);

  // hide empty/placeholder formulas; ignore formula_glossary entirely
  const filtered = (sections ?? []).filter((s) => {
    if (s.section_key === "formula_glossary") return false;
    if (s.section_key === "formulas" && isPlaceholderFormula(s.markdown_content || "")) return false;
    return (s.markdown_content || "").trim().length > 0;
  });

  const sorted = filtered.sort((a: any, b: any) => {
    const ia = ORDER.indexOf(a.section_key);
    const ib = ORDER.indexOf(b.section_key);
    if (ia !== -1 && ib !== -1 && ia !== ib) return ia - ib;
    const oa = a.order_index ?? 0;
    const ob = b.order_index ?? 0;
    if (oa !== ob) return oa - ob;
    return a.section_key.localeCompare(b.section_key);
  });

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-2 text-3xl font-bold">{lesson.title}</h1>
      {lesson.summary && <p className="mb-6 text-gray-600">{lesson.summary}</p>}

      <div className="space-y-8">
        {sorted.map((s) => {
          if (s.section_key === "demo") {
            const { img, rest } = splitFirstImage(s.markdown_content || "");
            return (
              <section key={s.section_key}>
                <h2 className="mb-2 text-xl font-semibold">{LABELS[s.section_key] ?? s.section_key}</h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                  <article className={img ? "prose max-w-none md:col-span-3" : "prose max-w-none md:col-span-5"}>
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {img ? rest : s.markdown_content || ""}
                    </ReactMarkdown>
                  </article>
                  {img && (
                    <aside className="md:col-span-2">
                      <img
                        src={img.src}
                        alt={img.alt || "Lesson example"}
                        className="w-full rounded-xl border object-cover"
                      />
                      {img.alt && <div className="mt-1 text-xs text-gray-500">{img.alt}</div>}
                    </aside>
                  )}
                </div>
              </section>
            );
          }
          return (
            <section key={s.section_key}>
              <h2 className="mb-2 text-xl font-semibold">{LABELS[s.section_key] ?? s.section_key}</h2>
              <article className="prose max-w-none">
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                  {s.markdown_content || ""}
                </ReactMarkdown>
              </article>
            </section>
          );
        })}

        {practice && practice.length > 0 && (
          <section>
            <h2 className="mb-2 text-xl font-semibold">Practice Together</h2>
            <ol className="ml-6 list-decimal space-y-4">
              {practice.map((p) => (
                <li key={p.order_index}>
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
