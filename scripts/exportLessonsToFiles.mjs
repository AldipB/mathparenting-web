#!/usr/bin/env node
/**
 * Export full lessons (title, summary, all sections, practice) from Supabase
 * into /public/lessons/<grade>/<slug>.json so Next.js can serve them statically.
 *
 * Requires env:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *
 * Optional args:
 *   --out=public/lessons        (destination root)
 *   --grade=k|1..12             (export only one grade slug)
 *   --overwrite                 (replace existing files)
 */
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import process from "process";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY in env.");
  process.exit(1);
}

const args = process.argv.slice(2);
const outRoot =
  (args.find(a => a.startsWith("--out="))?.split("=")[1]) || path.join(process.cwd(), "public", "lessons");
const onlyGrade =
  (args.find(a => a.startsWith("--grade="))?.split("=")[1]) || null;
const overwrite = args.includes("--overwrite");

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function slugify(s) {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeGradeSlug(s) {
  const x = String(s || "").toLowerCase();
  if (x === "kindergarten" || x === "kg" || x === "k" || x === "0") return "k";
  // coerce "01" -> "1"
  if (/^\d+$/.test(x)) return String(Number(x));
  return x;
}

async function fetchGrades() {
  const { data, error } = await supabase
    .from("grades")
    .select("id, slug, name, description");
  if (error) throw error;
  return (data || []).map(g => ({ ...g, slug: normalizeGradeSlug(g.slug) }));
}

async function fetchUnitsByGrade(gradeId) {
  const { data, error } = await supabase
    .from("units")
    .select("id, title, order_index, grade_id")
    .eq("grade_id", gradeId)
    .order("order_index", { ascending: true });
  if (error) throw error;
  return data || [];
}

async function fetchLessonsByGrade(gradeId) {
  // Join lessons with units to know grade_id
  const { data, error } = await supabase
    .from("lessons")
    .select("id, unit_id, order_index, slug, title, summary, difficulty_level, units!inner(grade_id)")
    .eq("units.grade_id", gradeId)
    .order("order_index", { ascending: true });
  if (error) throw error;
  return data || [];
}

async function fetchSectionsForLesson(lessonId) {
  const { data, error } = await supabase
    .from("lesson_sections")
    .select("section_key, markdown_content, order_index")
    .eq("lesson_id", lessonId)
    .order("order_index", { ascending: true });
  if (error) throw error;
  return data || [];
}

async function fetchPracticeForLesson(lessonId) {
  const { data, error } = await supabase
    .from("practice_problems")
    .select("order_index, question_md, hint_md, answer_md")
    .eq("lesson_id", lessonId)
    .order("order_index", { ascending: true });
  if (error) throw error;
  return data || [];
}

function repackageSections(rows) {
  // Turn row array → keyed object and keep list too
  const order = [];
  const map = {};
  for (const r of rows) {
    const key = r.section_key || "extra";
    order.push(key);
    map[key] = (r.markdown_content || "").trim();
  }
  return { order, sections: map };
}

async function main() {
  ensureDir(outRoot);

  const grades = await fetchGrades();
  const selected = onlyGrade
    ? grades.filter(g => g.slug === normalizeGradeSlug(onlyGrade))
    : grades;

  if (selected.length === 0) {
    console.error(`❌ No matching grade for: ${onlyGrade ?? "(all)"}`);
    process.exit(1);
  }

  for (const g of selected) {
    const gradeDir = path.join(outRoot, g.slug);
    ensureDir(gradeDir);

    const lessons = await fetchLessonsByGrade(g.id);
    if (lessons.length === 0) {
      console.log(`(i) No lessons found for grade ${g.slug}`);
      continue;
    }

    let wrote = 0, skipped = 0;
    for (const L of lessons) {
      // pick a good filename
      const slug = (L.slug && L.slug.trim()) ? L.slug : slugify(L.title || "");
      const file = path.join(gradeDir, `${slug}.json`);
      if (!overwrite && fs.existsSync(file)) {
        // If an existing file is suspiciously tiny (< 1KB), allow overwrite unless user forbade it
        const stat = fs.statSync(file);
        if (stat.size > 1024) { skipped++; continue; }
      }

      const [sectionsRows, practiceRows] = await Promise.all([
        fetchSectionsForLesson(L.id),
        fetchPracticeForLesson(L.id),
      ]);

      const { order, sections } = repackageSections(sectionsRows);

      const payload = {
        grade: g.slug,                      // "k" or "1".."12"
        grade_name: g.name,
        unit_id: L.unit_id,
        slug,
        title: L.title,
        summary: L.summary || "",
        difficulty: L.difficulty_level || "core",
        section_order: order,               // display order hint
        sections,                           // { overview, core, demo, math, guide, ... }
        practice: practiceRows.map(p => ({
          order_index: p.order_index ?? 0,
          question_md: p.question_md ?? "",
          hint_md: p.hint_md ?? "",
          answer_md: p.answer_md ?? "",
        })),
        _meta: {
          exported_at: new Date().toISOString(),
          source: "supabase",
        },
      };

      fs.writeFileSync(file, JSON.stringify(payload, null, 2), "utf8");
      wrote++;
      console.log("✓ wrote", path.relative(process.cwd(), file));
    }
    console.log(`Grade ${g.slug}: wrote ${wrote}, skipped ${skipped}`);
  }

  console.log("✅ Export complete.");
}

main().catch(err => {
  console.error("❌ Export failed:", err?.message || err);
  process.exit(1);
});
