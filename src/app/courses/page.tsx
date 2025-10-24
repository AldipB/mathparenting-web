'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type GradesIndex = { grades: string[] };

export default function CoursesPage() {
  const [grades, setGrades] = useState<string[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch('/lessons/_grades.json', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: GradesIndex) => { if (alive) setGrades(d.grades); })
      .catch(e => { if (alive) setErr(e.message); });
    return () => { alive = false; };
  }, []);

  if (err) return <p className="p-6 text-red-600">Failed to load grades: {err}</p>;
  if (!grades) return <p className="p-6">Loading grades…</p>;

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Courses (K–12)</h1>
      <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {grades.map(g => (
          <li key={g}>
            <Link
              href={`/courses/${encodeURIComponent(g)}`}
              className="block rounded-xl border p-4 hover:shadow transition"
            >
              {g.toLowerCase() === 'k' ? 'Kindergarten' : `Grade ${g}`}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
