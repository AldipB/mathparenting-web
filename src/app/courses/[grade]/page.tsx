// src/app/courses/[grade]/page.tsx
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { promises as fs } from "fs";
import path from "path";

export const revalidate = 60;

/** ---------- Types ---------- */
type Params = { grade: string };

type GradeRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
};

type UnitRow = {
  id: string;
  title: string | null;
  order_index: number | null;
  grade_id: string;
};

type LessonWithUnit = {
  id: string;
  title: string | null;
  slug: string | null;
  order_index: number | null;
  unit_id: string;
  units: UnitRow | null;
};

/** ---------- Helpers ---------- */
function normalizeGradeParam(raw: string) {
  const s = decodeURIComponent(raw).trim().toLowerCase();
  if (s === "k" || s === "kg" || s === "kindergarten") return "k";
  const m = s.match(/^(?:grade|g)[-\s]?(\d{1,2})$/);
  if (m) return String(Number(m[1]));
  if (/^\d{1,2}$/.test(s)) return String(Number(s));
  return s;
}

function slugify(s: string) {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Read local lessons if DB has none */
async function readLocalLessons(gradeSlug: string) {
  // Map slug “k” → directory “k” (and numeric “7” stays “7”)
  const dir = path.join(process.cwd(), "content", "lessons", gradeSlug);
  try {
    const files = await fs.readdir(dir);
    const jsonFiles = files.filter((f) => f.endsWith(".json"));
    const items = await Promise.all(
      jsonFiles.map(async (f) => {
        const filePath = path.join(dir, f);
        const raw = await fs.readFile(filePath, "utf8");
        let data: { title?: string } = {};
        try {
          data = JSON.parse(raw);
        } catch {
          // ignore bad json
        }
        const base = f.replace(/\.json$/i, "");
        return {
          title: data.title || base.replace(/-/g, " "),
          slug: base,
          href: `/courses/local/${encodeURIComponent(gradeSlug)}/${encodeURIComponent(base)}`,
        };
      })
    );
    // Sort nicely
    return items.sort((a, b) => a.title.localeCompare(b.title));
  } catch {
    return [];
  }
}

/** ---------- Page (Next 15) ---------- */
export default async function GradeTOC({
  params,
}: {
  params: Promise<Params>;
}) {
  const { grade: rawGrade } = await params;
  const slug = normalizeGradeParam(rawGrade);

  // 1) Resolve grade (or create a synthetic for local files)
  let grade: GradeRow | null = null;

  const { data: gradeExact } = await supabase
    .from("grades")
    .select("id, slug, name, description")
    .eq("slug", slug)
    .maybeSingle<GradeRow>();

  if (gradeExact) {
    grade = gradeExact;
  } else {
    const { data: found } = await supabase
      .from("grades")
      .select("id, slug, name, description")
      .ilike("slug", slug)
      .maybeSingle<GradeRow>();
    grade = found ?? null;
  }

  // If not in DB, synthesize a title for local content view
  if (!grade) {
    grade = {
      id: "local-" + slug,
      slug,
      name:
        slug === "k"
          ? "Kindergarten"
          : /^\d+$/.test(slug)
          ? `Grade ${slug}`
          : slug.toUpperCase(),
      description: null,
    };
  }

  // 2) Try DB lessons first (if this grade exists in DB)
  let lessons: LessonWithUnit[] = [];
  if (!grade.id.startsWith("local-")) {
    const { data } = await supabase
      .from("lessons")
      .select(
        "id, title, slug, order_index, unit_id, units!inner(id, title, order_index, grade_id)"
      )
      .eq("units.grade_id", grade.id)
      .returns<LessonWithUnit[]>();
    lessons = data ?? [];
  }

  // 3) If no DB lessons, fall back to local files
  const useLocal = lessons.length === 0;
  let localLessons: { title: string; slug: string; href: string }[] = [];
  if (useLocal) {
    localLessons = await readLocalLessons(grade.slug);
  }

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
      <h1 className="mb-2 text-3xl font-bold">{grade.name}</h1>
      {grade.description && (
        <p className="mb-6 text-gray-600">{grade.description}</p>
      )}

      <div className="mb-4">
        <input
          id="grade-filter"
          type="text"
          placeholder="Filter chapters (fractions, area, integers, decimals)"
          className="w-full rounded-xl border p-3"
        />
      </div>

      <div className="rounded-2xl border p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-2xl font-semibold">All Chapters</h2>
          <span className="text-sm text-gray-500">
            <span id="visible-count">
              {useLocal ? localLessons.length : lessons.length}
            </span>{" "}
            chapters
          </span>
        </div>

        {/* DB-backed lessons */}
        {!useLocal && (
          <ol className="ml-6 list-decimal space-y-1">
            {[...lessons]
              .sort((a, b) => {
                const ua = a.units?.order_index ?? 0;
                const ub = b.units?.order_index ?? 0;
                if (ua !== ub) return ua - ub;
                const la = a.order_index ?? 0;
                const lb = b.order_index ?? 0;
                if (la !== lb) return la - lb;
                return (a.title ?? "").localeCompare(b.title ?? "");
              })
              .map((l) => {
                const ls = l.slug && l.slug.trim() ? l.slug : slugify(l.title ?? "");
                const href = `/courses/${grade!.slug}/${l.unit_id}/${encodeURIComponent(ls)}`;
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
                      <span className="text-xs text-gray-500">
                        {" "}
                        — {l.units.title}
                      </span>
                    )}
                  </li>
                );
              })}
          </ol>
        )}

        {/* File-backed lessons */}
        {useLocal && (
          <ol className="ml-6 list-decimal space-y-1">
            {localLessons.map((l) => (
              <li
                key={l.slug}
                data-lesson-item
                data-text={l.title}
              >
                <Link className="underline" href={l.href}>
                  {l.title}
                </Link>
              </li>
            ))}
          </ol>
        )}
      </div>

      <script dangerouslySetInnerHTML={{ __html: clientFilterScript }} />
    </main>
  );
}
