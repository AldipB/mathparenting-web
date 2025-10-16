// src/app/courses/search/page.tsx
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export const revalidate = 60;

/** ---------- Types ---------- */
type SP = { q?: string };

type LessonRow = {
  id: string;
  title: string | null;
  slug: string | null;
  order_index: number | null;
  unit_id: string;
};

type UnitRow = {
  id: string;
  title: string | null;
  order_index: number | null;
  grade_id: string;
};

type GradeRow = {
  id: string;
  slug: string; // "k" | "1" | ... | "12"
  name: string;
};

/** ---------- Helpers ---------- */
function slugify(s: string) {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** ---------- Page (Next 15: searchParams is a Promise) ---------- */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const { q = "" } = (await searchParams) ?? {};
  const query = q.trim();

  if (!query) {
    return (
      <main className="mx-auto max-w-5xl p-6">
        <h1 className="mb-2 text-3xl font-bold">Search Lessons</h1>
        <p className="mb-6 text-gray-600">
          Type a topic in the address bar like <code>?q=fractions</code>, or use the field below:
        </p>
        <form action="/courses/search" method="GET" className="flex gap-2">
          <input
            name="q"
            defaultValue=""
            placeholder="fractions, area, slope, integers, decimals"
            className="w-full rounded-xl border p-3"
          />
          <button className="rounded-xl border px-4 py-2">Search</button>
        </form>
      </main>
    );
  }

  // 1) Search lessons by title/slug (simple, reliable)
  const { data: lessons, error: lessonsErr } = await supabase
    .from("lessons")
    .select("id, title, slug, order_index, unit_id")
    .or(
      `title.ilike.%${query.replace(/%/g, "\\%").replace(/_/g, "\\_")}%,slug.ilike.%${query
        .replace(/%/g, "\\%")
        .replace(/_/g, "\\_")}%`
    )
    .order("order_index", { ascending: true })
    .returns<LessonRow[]>();

  if (lessonsErr) {
    return (
      <main className="mx-auto max-w-5xl p-6">
        <h1 className="mb-2 text-3xl font-bold">Search Lessons</h1>
        <p className="text-red-600">Search failed: {lessonsErr.message}</p>
      </main>
    );
  }

  const unitIds = Array.from(new Set((lessons ?? []).map((l) => l.unit_id)));
  let units: UnitRow[] = [];
  if (unitIds.length > 0) {
    const { data: u } = await supabase
      .from("units")
      .select("id, title, order_index, grade_id")
      .in("id", unitIds)
      .returns<UnitRow[]>();
    units = u ?? [];
  }
  const unitsById = new Map(units.map((u) => [u.id, u]));

  const gradeIds = Array.from(new Set(units.map((u) => u.grade_id)));
  let grades: GradeRow[] = [];
  if (gradeIds.length > 0) {
    const { data: g } = await supabase
      .from("grades")
      .select("id, slug, name")
      .in("id", gradeIds)
      .returns<GradeRow[]>();
    grades = g ?? [];
  }
  const gradesById = new Map(grades.map((g) => [g.id, g]));

  // Build a rich view-model with hrefs
  const items = (lessons ?? [])
    .map((l) => {
      const unit = unitsById.get(l.unit_id) ?? null;
      const grade = unit ? gradesById.get(unit.grade_id) ?? null : null;
      const lessonSlug = l.slug && l.slug.trim() ? l.slug : slugify(l.title ?? "");
      const href =
        grade && unit
          ? `/courses/${grade.slug}/${unit.id}/${encodeURIComponent(lessonSlug)}`
          : null; // if data incomplete, hide link gracefully

      return {
        id: l.id,
        title: l.title ?? "(Untitled)",
        unitTitle: unit?.title ?? "",
        gradeName: grade?.name ?? "",
        gradeSlug: grade?.slug ?? "",
        href,
        unitOrder: unit?.order_index ?? 0,
        lessonOrder: l.order_index ?? 0,
      };
    })
    // Filter out items without enough data to link
    .filter((x) => x.href !== null)
    // Sort: grade (slug-ish), then unit order, then lesson order, then title
    .sort((a, b) => {
      const ga = a.gradeSlug;
      const gb = b.gradeSlug;
      if (ga !== gb) return ga.localeCompare(gb);
      if (a.unitOrder !== b.unitOrder) return a.unitOrder - b.unitOrder;
      if (a.lessonOrder !== b.lessonOrder) return a.lessonOrder - b.lessonOrder;
      return a.title.localeCompare(b.title);
    });

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="mb-2 text-3xl font-bold">Search Lessons</h1>

      <form action="/courses/search" method="GET" className="mb-6 flex gap-2">
        <input
          name="q"
          defaultValue={query}
          placeholder="fractions, area, slope, integers, decimals"
          className="w-full rounded-xl border p-3"
        />
        <button className="rounded-xl border px-4 py-2">Search</button>
      </form>

      <div className="rounded-2xl border p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-2xl font-semibold">
            Results for <em className="not-italic">“{query}”</em>
          </h2>
          <span className="text-sm text-gray-500">{items.length} matches</span>
        </div>

        {items.length === 0 ? (
          <p className="text-gray-600">
            No lessons matched. Try searching a different keyword or browse by grade on{" "}
            <Link className="underline" href="/courses">
              Courses
            </Link>
            .
          </p>
        ) : (
          <ol className="ml-6 list-decimal space-y-1">
            {items.map((it) => (
              <li
                key={it.id}
                data-lesson-item
                data-text={`${it.title} ${it.unitTitle} ${it.gradeName}`}
              >
                <Link className="underline" href={it.href as string}>
                  {it.title}
                </Link>{" "}
                <span className="text-xs text-gray-500">
                  — {it.gradeName}
                  {it.unitTitle ? ` / ${it.unitTitle}` : ""}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </main>
  );
}
