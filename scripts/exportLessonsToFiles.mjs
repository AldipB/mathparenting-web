// scripts/exportLessonsToFiles.mjs
// Export all lessons from Supabase tables into /public/lessons/<gradeSlug>/<lessonSlug>.json
// Uses anon key by default (works if RLS is OFF on content tables). If RLS is ON,
// put SUPABASE_SERVICE_ROLE_KEY in .env.local and the script will use it locally.

import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: [".env.local", ".env"] });

const URL  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SRV  = process.env.SUPABASE_SERVICE_ROLE_KEY; // optional (local only)

if (!URL || !(ANON || SRV)) {
  console.error("❌ Missing Supabase env. Need NEXT_PUBLIC_SUPABASE_URL and ANON (or SUPABASE_SERVICE_ROLE_KEY).");
  process.exit(1);
}

const supabase = createClient(URL, SRV || ANON, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function slugify(s = "") {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

async function main() {
  console.log("🔌 Connecting to Supabase…");

  // 1) Load grades
  const { data: grades, error: gErr } = await supabase
    .from("grades")
    .select("id, slug, name")
    .order("slug", { ascending: true });

  if (gErr) throw gErr;
  if (!grades?.length) {
    console.error("❌ No grades found. Are the tables populated?");
    process.exit(1);
  }

  const outRoot = path.join(process.cwd(), "public", "lessons");
  ensureDir(outRoot);

  let fileCount = 0;

  // 2) For each grade, pull its lessons and related data
  for (const grade of grades) {
    const gradeDir = path.join(outRoot, grade.slug);
    ensureDir(gradeDir);

    // pull lessons joined with units so we know unit context
    const { data: lessons, error: lErr } = await supabase
      .from("lessons")
      .select("id, unit_id, slug, title, summary, difficulty_level, order_index, units!inner(id, title, order_index, grade_id)")
      .eq("units.grade_id", grade.id)
      .order("order_index", { ascending: true });

    if (lErr) throw lErr;

    if (!lessons?.length) {
      console.log(`⚠️  No lessons for grade ${grade.slug} (${grade.name})`);
      continue;
    }

    // For each lesson: sections + practice
    for (const L of lessons) {
      const lessonSlug = (L.slug && L.slug.trim()) ? L.slug.trim() : slugify(L.title || "untitled");

      const [secRes, pracRes] = await Promise.all([
        supabase
          .from("lesson_sections")
          .select("section_key, markdown_content, order_index")
          .eq("lesson_id", L.id)
          .order("order_index", { ascending: true }),
      supabase
          .from("practice_problems")
          .select("order_index, question_md, hint_md, answer_md")
          .eq("lesson_id", L.id)
          .order("order_index", { ascending: true }),
      ]);

      const sections = (secRes.data || []).slice().sort((a, b) => {
        const oa = a.order_index ?? 0;
        const ob = b.order_index ?? 0;
        if (oa !== ob) return oa - ob;
        return (a.section_key || "").localeCompare(b.section_key || "");
      });

      const practice = pracRes.data || [];

      // Assemble file payload (simple, static-friendly)
      const payload = {
        grade: {
          id: grade.id,
          slug: grade.slug,
          name: grade.name,
        },
        unit: {
          id: L.units?.id ?? L.unit_id ?? null,
          title: L.units?.title ?? null,
          order_index: L.units?.order_index ?? null,
        },
        lesson: {
          id: L.id,
          slug: lessonSlug,
          title: L.title,
          summary: L.summary ?? "",
          difficulty_level: L.difficulty_level ?? "core",
          order_index: L.order_index ?? 0,
        },
        // store sections as an array and also as a keyed map for convenience
        sectionsArray: sections.map(s => ({
          key: s.section_key,
          md: s.markdown_content ?? "",
          order_index: s.order_index ?? 0,
        })),
        sections: Object.fromEntries(
          sections.map(s => [s.section_key, s.markdown_content ?? ""])
        ),
        practice, // [{order_index,question_md,hint_md,answer_md}]
      };

      const outPath = path.join(gradeDir, `${lessonSlug}.json`);

      fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), "utf8");
      fileCount++;
      console.log(`✅ wrote ${path.relative(process.cwd(), outPath)}`);
    }
  }

  console.log(`\n🎉 Done. Wrote ${fileCount} lesson file(s) under public/lessons/`);
}

main().catch((e) => {
  console.error("❌ Export failed:", e?.message || e);
  process.exit(1);
});
