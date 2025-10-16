// src/app/courses/page.tsx
import fs from "fs";
import path from "path";
import Link from "next/link";

export const revalidate = 60;

type GradeEntry = { slug: string; name: string; count: number };

function humanize(slug: string) {
  if (slug.toLowerCase() === "k") return "Kindergarten";
  return `Grade ${slug}`;
}

export default async function CoursesIndex() {
  const root = path.join(process.cwd(), "public", "lessons");
  const grades: GradeEntry[] = [];

  if (fs.existsSync(root)) {
    for (const d of fs.readdirSync(root, { withFileTypes: true })) {
      if (!d.isDirectory()) continue;
      const slug = d.name; // "k", "1", "2", ... "12"
      const dir = path.join(root, slug);
      const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
      grades.push({ slug, name: humanize(slug), count: files.length });
    }
  }

  // Sort K, 1..12
  grades.sort((a, b) => {
    const aKey = a.slug.toLowerCase() === "k" ? 0 : Number(a.slug) || 0;
    const bKey = b.slug.toLowerCase() === "k" ? 0 : Number(b.slug) || 0;
    return aKey - bKey;
  });

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="mb-2 text-3xl font-bold">All Courses</h1>
      <p className="mb-6 text-gray-600">
        Pick a grade to view its lessons.
      </p>

      {grades.length === 0 ? (
        <div className="rounded-xl border p-4 text-red-600">
          No grades found in <code>/public/lessons</code>. Make sure those folders
          exist and are committed.
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {grades.map((g) => (
            <li key={g.slug} className="rounded-xl border p-4">
              <Link
                href={`/courses/${encodeURIComponent(g.slug)}`}
                className="block underline"
                prefetch={true}
              >
                {g.name}
              </Link>
              <div className="mt-1 text-xs text-gray-500">{g.count} lessons</div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
