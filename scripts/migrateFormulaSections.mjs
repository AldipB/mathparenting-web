import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
if (!url || !key) throw new Error("Missing env vars.");

const db = createClient(url, key, { auth: { persistSession: false } });

function isPlaceholder(md = "") {
  const t = md.trim().toLowerCase();
  if (!t) return true;
  if (t.includes("if this topic uses formulas")) return true;
  if (t.startsWith("**key formula(s):**") && !t.match(/\$|\\frac|=|\\pi|\\sqrt/)) return true;
  return false;
}

async function getAllLessons() {
  const { data, error } = await db.from("lessons").select("id, title, slug");
  if (error) throw error;
  return data || [];
}

async function getSection(lesson_id, key) {
  const { data, error } = await db
    .from("lesson_sections")
    .select("id, markdown_content, order_index")
    .eq("lesson_id", lesson_id)
    .eq("section_key", key)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

async function updateSection(id, md) {
  const { error } = await db.from("lesson_sections").update({ markdown_content: md }).eq("id", id);
  if (error) throw error;
}

async function deleteSection(id) {
  const { error } = await db.from("lesson_sections").delete().eq("id", id);
  if (error) throw error;
}

(async function run() {
  console.log("Merging formula_glossary under formulas and removing placeholders…");
  const lessons = await getAllLessons();
  let merged = 0, deletedPlaceholders = 0, removedGlossary = 0;

  for (const L of lessons) {
    const formulas = await getSection(L.id, "formulas");
    const glossary = await getSection(L.id, "formula_glossary");

    // Merge glossary into formulas
    if (glossary && glossary.markdown_content && glossary.markdown_content.trim()) {
      const base = (formulas?.markdown_content || "").trim();
      const mergedMd =
        (base ? base + "\n\n" : "") +
        "**Symbol meanings:**\n" +
        glossary.markdown_content.trim();
      if (formulas?.id) {
        await updateSection(formulas.id, mergedMd);
      } else {
        // create formulas if missing
        const { error } = await db.from("lesson_sections").insert({
          lesson_id: L.id,
          section_key: "formulas",
          order_index: 6,
          markdown_content: mergedMd,
        });
        if (error) throw error;
      }
      // delete glossary
      await deleteSection(glossary.id);
      removedGlossary++;
      merged++;
    }

    // Remove placeholder-only formulas
    const f2 = formulas ? await getSection(L.id, "formulas") : await getSection(L.id, "formulas");
    if (f2 && isPlaceholder(f2.markdown_content)) {
      await deleteSection(f2.id);
      deletedPlaceholders++;
    }
  }

  console.log(`✅ Done. Merged: ${merged}, Glossaries removed: ${removedGlossary}, Placeholders deleted: ${deletedPlaceholders}`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
