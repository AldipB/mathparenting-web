// src/app/courses/page.tsx
import fs from "fs";
import path from "path";

export const revalidate = 60;

function detectGrades(): string[] {
  // Read from /public/lessons to know which grades exist
  const root = path.join(process.cwd(), "public", "lessons");
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    // sort K first, then numeric
    .sort((a, b) => {
      if (a === "k") return -1;
      if (b === "k") return 1;
      const na = Number(a), nb = Number(b);
      if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
      return a.localeCompare(b);
    });
}

const label = (g: string) => (g.toLowerCase() === "k" ? "Kindergarten" : `Grade ${g}`);

export default async function CoursesHome() {
  const grades = detectGrades();

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="mb-2 text-3xl font-bold">Courses</h1>
      <p className="mb-6 text-gray-600">
        Choose a grade to see all chapters available from your exported lesson files.
      </p>

      {grades.length === 0 ? (
        <div className="rounded-xl border p-4">
          <p className="text-red-600">
            No grades detected under <code>/public/lessons</code>. Add folders like{" "}
            <code>k</code>, <code>1</code>, <code>2</code>… with JSON files inside.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {grades.map((g) => (
            <li key={g} className="rounded-xl border p-3">
              {/* Plain <a> to force navigation even if a client overlay exists */}
              <a className="underline block" href={`/courses/${encodeURIComponent(g)}`}>
                {label(g)}
              </a>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
