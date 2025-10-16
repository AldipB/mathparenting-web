// app/courses/search/page.tsx
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

export const revalidate = 30;

type SP = { searchParams?: { q?: string } };

export default async function CourseSearchPage({ searchParams }: SP) {
  const q = (searchParams?.q || "").trim();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  let results: any[] = [];

  if (q.length >= 2) {
    // 1) Lessons whose *lesson title* matches
    const { data: byLessonTitle, error: e1 } = await supabase
      .from("lessons")
      .select(`
        id, title, slug, order_index, unit_id,
        units!inner (
          id, title, order_index, grade_id,
          grades:grades!inner ( id, slug, name )
        )
      `)
      .ilike("title", `%${q}%`);

    // 2) Lessons whose *unit title* matches
    const { data: unitsMatch, error: e2 } = await supabase
      .from("units")
      .select(`
        id, title, order_index, grade_id,
        grades:grades!inner ( id, slug, name )
      `)
      .ilike("title", `%${q}%`);

    let byUnitTitle: any[] = [];
    if (!e2 && unitsMatch && unitsMatch.length > 0) {
      const unitIds = unitsMatch.map((u) => u.id);
      const { data: lessonsInUnits, error: e3 } = await supabase
        .from("lessons")
        .select(`
          id, title, slug, order_index, unit_id,
          units!inner (
            id, title, order_index, grade_id,
            grades:grades!inner ( id, slug, name )
          )
        `)
        .in("unit_id", unitIds);
      if (!e3 && lessonsInUnits) byUnitTitle = lessonsInUnits;
    }

    // Merge + dedupe by lesson id
    const map = new Map<number, any>();
    for (const row of [...(byLessonTitle || []), ...byUnitTitle]) {
      map.set(row.id, row);
    }
    const merged = Array.from(map.values());

    // Sort: grade K→12, then unit order, then lesson order, then title
    const rank = (slug: string) => (slug === "k" ? 0 : Number(slug));
    results = merged.sort((a: any, b: any) => {
      const ga = rank(a.units.grades.slug);
      const gb = rank(b.units.grades.slug);
      if (ga !== gb) return ga - gb;
      const ua = a.units?.order_index ?? 0;
      const ub = b.units?.order_index ?? 0;
      if (ua !== ub) return ua - ub;
      const la = a.order_index ?? 0;
      const lb = b.order_index ?? 0;
      if (la !== lb) return la - lb;
      return (a.title || "").localeCompare(b.title || "");
    });
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="mb-4 text-3xl font-bold">Find the Chapter You Need</h1>

      <form className="mb-6" action="/courses/search" method="get">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Try: fractions, area, slope, Pythagoras, decimals…"
          className="w-full rounded-xl border p-3"
          aria-label="Search chapters"
        />
        <div className="mt-3 flex items-center gap-3">
          <button className="rounded-xl border px-4 py-2 hover:bg-gray-50" type="submit">
            Search
          </button>
          {q && (
            <Link className="text-sm text-gray-600 underline" href="/courses/search">
              Clear
            </Link>
          )}
        </div>
      </form>

      {!q && (
        <p className="text-gray-600">
          Type a topic and we’ll show you the best match for each grade. Parents
          get plain-language explanations, household demonstrations, formulas,
          symbol meanings, and practice.
        </p>
      )}

      {q && (
        <>
          <div className="mb-3 text-sm text-gray-600">
            Showing {results.length} result{results.length === 1 ? "" : "s"} for{" "}
            <span className="font-medium">“{q}”</span>
          </div>

          <ul className="space-y-3">
            {results.map((r: any) => (
              <li key={r.id} className="rounded-2xl border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs text-gray-500">
                      {r.units.grades.name} • {r.units.title}
                    </div>
                    <Link
                      className="text-lg font-semibold underline"
                      href={`/courses/${r.units.grades.slug}/${r.unit_id}/${r.slug}`}
                    >
                      {r.title}
                    </Link>
                  </div>
                  <Link
                    className="rounded-lg border px-3 py-1 text-sm hover:bg-gray-50"
                    href={`/courses/${r.units.grades.slug}`}
                    title="Open all chapters for this grade"
                  >
                    All chapters →
                  </Link>
                </div>
              </li>
            ))}
          </ul>

          {results.length === 0 && (
            <p className="text-gray-600">
              No direct matches. Try synonyms like “percent” → “percentage”, “divide”
              → “division”, “graph line” → “slope”.
            </p>
          )}
        </>
      )}
    </main>
  );
}
