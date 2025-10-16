// src/app/courses/[grade]/page.tsx
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

export const revalidate = 60;

function normalizeGradeParam(raw: string) {
  const s = decodeURIComponent(raw).trim().toLowerCase();
  if (s === "k" || s === "kg" || s === "kindergarten") return "k";
  const m = s.match(/^(?:grade|g)[-\s]?(\d{1,2})$/);
  if (m) return String(Number(m[1]));
  if (/^\d{1,2}$/.test(s)) return String(Number(s));
  return s;
}

// simple fallback if a lesson has no slug in DB
function slugify(s: string) {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default async function GradeTOC({ params }: { params: { grade: string } }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const slug = normalizeGradeParam(params.grade);

  let { data: grade } = await supabase
    .from("grades")
    .select("id, slug, name, description")
    .eq("slug", slug)
    .maybeSingle();

  if (!grade) {
    const { data: found } = await supabase
      .from("grades")
      .select("id, slug, name, description")
      .ilike("slug", slug)
      .maybeSingle();
    grade = found || null;
  }

  if (!grade) {
    const { data: allGrades } = await supabase
      .from("grades")
      .select("id, slug, name")
      .order("slug", { ascending: true });
    return (
      <main className="mx-auto max-w-5xl p-6">
        <h1 className="text-3xl font-bold mb-4">Grade not found</h1>
        <p className="mb-4 text-gray-600">
          We couldn’t find <code className="rounded bg-gray-100 px-1 py-0.5">{params.grade}</code>.
          Try one of these:
        </p>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {(allGrades ?? []).map((g) => (
            <li key={g.id} className="rounded-xl border p-3">
              <Link className="underline" href={`/courses/${g.slug}`}>{g.name}</Link>
            </li>
          ))}
        </ul>
      </main>
    );
  }

  const { data: lessons, error } = await supabase
    .from("lessons")
    .select(
      "id, title, slug, order_index, unit_id, units!inner(id, title, order_index, grade_id)"
    )
    .eq("units.grade_id", grade.id);

  if (error) {
    return (
      <main className="mx-auto max-w-5xl p-6">
        <h1 className="text-3xl font-bold mb-2">{grade.name}</h1>
        <p className="text-red-600">Failed to load chapters: {error.message}</p>
      </main>
    );
  }

  const sorted = (lessons ?? []).sort((a: any, b: any) => {
    const ua = a.units?.order_index ?? 0;
    const ub = b.units?.order_index ?? 0;
    if (ua !== ub) return ua - ub;
    const la = a.order_index ?? 0;
    const lb = b.order_index ?? 0;
    if (la !== lb) return la - lb;
    return (a.title || "").localeCompare(b.title || "");
  });

  const clientFilterScript = `
    (function(){
      const input = document.getElementById('grade-filter');
      const count = document.getElementById('visible-count');
      const items = Array.from(document.querySelectorAll('[data-lesson-item]'));
      function apply(){
        const q = (input?.value || '').trim().toLowerCase();
        let visible = 0;
        for (const li of items){
          const text = (li.getAttribute('data-text') || '').toLowerCase();
          const show = !q || text.includes(q);
          li.style.display = show ? '' : 'none';
          if (show) visible++;
        }
        if (count) count.textContent = String(visible);
      }
      input?.addEventListener('input', apply);
      apply();
    })();
  `;

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-3xl font-bold mb-2">{grade.name}</h1>
      {grade.description && <p className="text-gray-600 mb-6">{grade.description}</p>}

      <div className="mb-4">
        <input
          id="grade-filter"
          type="text"
          placeholder="Filter chapters (fractions, area, time, slope, decimals)"
          className="w-full rounded-xl border p-3"
        />
      </div>

      <div className="rounded-2xl border p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-2xl font-semibold">All Chapters</h2>
          <span className="text-sm text-gray-500">
            <span id="visible-count">{sorted.length}</span> chapters
          </span>
        </div>

        <ol className="ml-6 list-decimal space-y-1">
          {sorted.map((l: any) => {
            const ls = l.slug && l.slug.trim() ? l.slug : slugify(l.title || "");
            const href = `/courses/${grade.slug}/${l.unit_id}/${encodeURIComponent(ls)}`;
            return (
              <li
                key={l.id}
                data-lesson-item
                data-text={`${l.title ?? ""} ${l.units?.title ?? ""}`}
              >
                <Link className="underline" href={href}>
                  {l.title}
                </Link>
                {l.units?.title && (
                  <span className="text-xs text-gray-500"> — {l.units.title}</span>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      <script dangerouslySetInnerHTML={{ __html: clientFilterScript }} />
    </main>
  );
}
