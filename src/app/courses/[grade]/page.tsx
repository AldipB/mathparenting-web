// src/app/courses/[grade]/page.tsx
import fs from "fs";
import path from "path";
import Link from "next/link";

export const revalidate = 60;

function normalizeGrade(raw: string) {
  const s = decodeURIComponent(raw).trim().toLowerCase();
  if (s === "k" || s === "kg" || s === "kindergarten" || s === "0") return "k";
  if (/^(?:grade|g)[-\s]?(\d{1,2})$/.test(s)) return String(Number(RegExp.$1));
  if (/^\d{1,2}$/.test(s)) return String(Number(s));
  return s;
}

type LessonItem = { slug: string; title: string; summary?: string };

async function listLessons(gradeSlug: string): Promise<LessonItem[]> {
  const dir = path.join(process.cwd(), "public", "lessons", gradeSlug);
  if (!fs.existsSync(dir)) return [];

  const out: LessonItem[] = [];
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json"))) {
    const slug = f.replace(/\.json$/, "");
    try {
      const raw = fs.readFileSync(path.join(dir, f), "utf8");
      const json = JSON.parse(raw);
      const title: string =
        json.title ??
        json.meta?.title ??
        slug.replace(/[-_]/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
      const summary: string | undefined = json.summary ?? json.meta?.summary ?? undefined;
      out.push({ slug, title, summary });
    } catch {
      // skip invalid JSON
    }
  }
  out.sort((a, b) => a.title.localeCompare(b.title));
  return out;
}

export default async function GradeTOC({
  params,
}: {
  // Next 15 expects awaiting params
  params: Promise<{ grade: string }>;
}) {
  const { grade } = await params;
  const gradeSlug = normalizeGrade(grade);
  const readable = gradeSlug === "k" ? "Kindergarten" : `Grade ${gradeSlug}`;

  const lessons = await listLessons(gradeSlug);

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="mb-2 text-3xl font-bold">{readable}</h1>
      <p className="mb-6 text-gray-600">
        {lessons.length
          ? "Choose a chapter to open the full parent-friendly lesson."
          : "No lessons found for this grade in /public/lessons. Ensure files are committed and deployed."}
      </p>

      {lessons.length > 0 && (
        <div className="rounded-2xl border p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-2xl font-semibold">All Chapters</h2>
            <span className="text-sm text-gray-500">{lessons.length} chapters</span>
          </div>

          <ol className="ml-6 list-decimal space-y-2">
            {lessons.map((l) => {
              // use dummy unitId "all" to satisfy the 3-segment lesson route
              const href = `/courses/${encodeURIComponent(gradeSlug)}/all/${encodeURIComponent(
                l.slug
              )}`;
              return (
                <li key={l.slug}>
                  <Link className="underline" href={href} prefetch={true}>
                    {l.title}
                  </Link>
                  {l.summary && <div className="text-xs text-gray-500">{l.summary}</div>}
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </main>
  );
}
