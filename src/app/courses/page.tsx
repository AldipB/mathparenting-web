// src/app/courses/page.tsx
import fs from "node:fs";
import path from "node:path";
import Link from "next/link";

export const revalidate = 60;

function listGrades(): string[] {
  const root = path.join(process.cwd(), "public", "lessons");
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort((a, b) => {
      const na = a.toLowerCase() === "k" ? 0 : Number.isFinite(Number(a)) ? Number(a) : 999;
      const nb = b.toLowerCase() === "k" ? 0 : Number.isFinite(Number(b)) ? Number(b) : 999;
      if (na !== nb) return na - nb;
      return a.localeCompare(b);
    });
}

function prettyGrade(g: string) {
  if (g.toLowerCase() === "k") return "Kindergarten";
  const n = Number(g);
  return Number.isFinite(n) ? `Grade ${n}` : g;
}

export default async function CoursesIndex() {
  const grades = listGrades();

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="mb-2 text-3xl font-bold">Courses</h1>
      <p className="mb-6 text-gray-600">Pick a grade to see its available lessons.</p>

      {grades.length === 0 ? (
        <div className="rounded-xl border p-6">
          <p>No lessons found under <code>public/lessons/</code>.</p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {grades.map((g) => (
            <li key={g} className="rounded-xl border p-3">
              <Link className="underline" href={`/courses/${encodeURIComponent(g)}`}>
                {prettyGrade(g)}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
