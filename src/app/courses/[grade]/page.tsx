// src/app/courses/[grade]/page.tsx
import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import { notFound } from "next/navigation";

export const revalidate = 60;

function toTitle(slug: string) {
  return slug
    .replace(/\.json$/i, "")
    .split("-")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ""))
    .join(" ");
}

export default async function GradePage(props: { params: Promise<{ grade: string }> }) {
  const { grade } = await props.params; // ✅ Next 15 promise-params
  const key = decodeURIComponent(grade).toLowerCase();
  const dir = path.join(process.cwd(), "public", "lessons", key);

  if (!fs.existsSync(dir)) return notFound();

  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="mb-2 text-3xl font-bold">{key === "k" ? "Kindergarten" : `Grade ${key}`}</h1>
      <p className="mb-6 text-gray-600">
        {files.length} lesson{files.length === 1 ? "" : "s"} available.
      </p>

      {files.length === 0 ? (
        <div className="rounded-xl border p-6">
          <p>No lesson JSON files found under <code>public/lessons/{key}</code>.</p>
        </div>
      ) : (
        <ol className="ml-6 list-decimal space-y-1">
          {files.map((f) => {
            const slug = f.replace(/\.json$/i, "");
            return (
              <li key={f}>
                <Link className="underline" href={`/courses/${encodeURIComponent(key)}/${encodeURIComponent(slug)}`}>
                  {toTitle(slug)}
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </main>
  );
}
