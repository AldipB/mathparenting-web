// src/app/courses/page.tsx
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export const revalidate = 60;

/** ---------- Types ---------- */
type GradeRow = {
  id: string;
  slug: string; // "k" | "1" | ... | "12"
  name: string;
  description: string | null;
};

/** ---------- Page ---------- */
export default async function CoursesHome() {
  // Fetch all grades for the Courses landing
  const { data: grades, error } = await supabase
    .from("grades")
    .select("id, slug, name, description")
    .order("slug", { ascending: true })
    .returns<GradeRow[]>();

  if (error) {
    return (
      <main className="mx-auto max-w-5xl p-6">
        <h1 className="mb-2 text-3xl font-bold">Courses</h1>
        <p className="text-red-600">Failed to load grades: {error.message}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold">Courses</h1>

        {/* GET /courses/search?q=... */}
        <form action="/courses/search" method="GET" className="flex gap-2">
          <input
            name="q"
            placeholder="Search topics (fractions, area, integers, decimals)"
            className="w-full rounded-xl border p-3 sm:w-80"
          />
          <button className="rounded-xl border px-4 py-2">Search</button>
        </form>
      </div>

      <p className="mb-6 text-gray-600">
        Pick a grade to browse all chapters and lessons.
      </p>

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {(grades ?? []).map((g) => (
          <li key={g.id} className="rounded-2xl border p-5">
            <h2 className="mb-1 text-xl font-semibold">
              <Link className="underline" href={`/courses/${g.slug}`}>
                {g.name}
              </Link>
            </h2>
            {g.description && (
              <p className="text-sm text-gray-600 line-clamp-3">
                {g.description}
              </p>
            )}
            <div className="mt-3">
              <Link
                className="inline-block rounded-xl border px-3 py-1 text-sm underline"
                href={`/courses/${g.slug}`}
              >
                View chapters →
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
