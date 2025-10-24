'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type LessonItem = { slug: string; title: string };
type GradeIndex = { grade: string; lessons: LessonItem[] };

// Loosen props type to avoid Next 15 PageProps constraint on client
export default function GradePage(props: any) {
  const grade: string = props?.params?.grade;
  const [data, setData] = useState<GradeIndex | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!grade) return;
    let alive = true;
    fetch(`/lessons/${encodeURIComponent(grade)}/_index.json`, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: GradeIndex) => { if (alive) setData(d); })
      .catch(e => { if (alive) setErr(e.message); });
    return () => { alive = false; };
  }, [grade]);

  if (!grade) return <p className="p-6 text-red-600">Missing grade.</p>;
  if (err) return <p className="p-6 text-red-600">Failed to load lessons: {err}</p>;
  if (!data) return <p className="p-6">Loading lessons…</p>;

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">
        {grade.toLowerCase() === 'k' ? 'Kindergarten' : `Grade ${grade}`} — Lessons
      </h1>

      {data.lessons.length === 0 ? (
        <p>No lessons yet.</p>
      ) : (
        <ul className="space-y-2">
          {data.lessons.map(item => (
            <li key={item.slug}>
              <Link
                href={`/courses/${encodeURIComponent(grade)}/${encodeURIComponent(item.slug)}`}
                className="block rounded-lg border p-4 hover:shadow transition"
              >
                {item.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
