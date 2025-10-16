// src/app/courses/page.tsx
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

export const revalidate = 60;

export default async function CoursesHome() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase
    .from("grades")
    .select("id, slug, name, description");

  if (error) {
    return (
      <main className="mx-auto max-w-5xl p-6">
        <h1 className="text-3xl font-bold mb-4">Courses</h1>
        <p className="text-red-600">Failed to load grades: {error.message}</p>
      </main>
    );
  }

  const grades = (data ?? []).sort((a: any, b: any) => {
    const rank = (s: string) => (s?.toLowerCase() === "k" ? 0 : Number(s));
    return rank(a.slug) - rank(b.slug);
  });

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-3xl font-bold mb-2">Math Courses for Parents</h1>
      <p className="mb-6 text-gray-600">
        Choose a grade to see every chapter.
      </p>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
        {grades.map((g: any) => (
          <li key={g.id} className="rounded-2xl border p-4 hover:bg-gray-50">
            <Link href={`/courses/${g.slug}`} className="block">
              <div className="text-lg font-semibold">{g.name}</div>
              {g.description && (
                <div className="mt-1 line-clamp-2 text-sm text-gray-600">
                  {g.description}
                </div>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
