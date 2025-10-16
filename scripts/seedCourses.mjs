// scripts/seedCourses.mjs
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import { CURRICULUM } from './curriculumData.mjs';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
}
const db = createClient(url, key, { auth: { persistSession: false } });

const kebab = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const SECTION_ORDER = ['overview','core','demo','math','guide','mistakes','connection','practice','close'];

const tmpl = (title, gradeName) => ({
  overview: `**What this is:** ${title} — explained for parents.
**Why it matters:** Everyday usefulness and confidence-building for your child in ${gradeName}.`,
  core: `**Core Idea:** One friendly paragraph that states the big idea in plain language.`,
  demo: `**Household Demonstration:** A quick at-home activity (kitchen, shopping, travel, chores) to *show* the idea.`,
  math: `**The Math Behind It:** Include notation and formulas as needed. Use KaTeX: $$a^2+b^2=c^2$$ (example).`,
  guide: `**Step-by-Step Teaching Guide:** 4–6 steps with questions to ask and what to listen for.`,
  mistakes: `**Common Mistakes to Avoid:** 3–5 pitfalls and how to respond encouragingly.`,
  connection: `**Real-Life Connection or Fun Fact:** A short story or tip that makes it memorable.`,
  practice: `**Practice Together:** Add 8–10 scaffolded questions later. (Three starter placeholders are below.)`,
  close: `**You’re doing great — your steady guidance matters more than perfection.**`,
});

async function getOrCreate(table, match, insert) {
  const { data } = await db.from(table).select('id').match(match).maybeSingle?.() ?? await db.from(table).select('id').match(match).single().catch(()=>({}));
  if (data?.id) return data.id;
  const { data: ins, error } = await db.from(table).insert(insert).select('id').single();
  if (error) throw error;
  return ins.id;
}

async function run() {
  console.log('Seeding curriculum …');

  for (const grade of CURRICULUM) {
    const gradeId = await getOrCreate(
      'grades',
      { slug: grade.slug },
      { slug: grade.slug, name: grade.name, description: grade.description, global_alignment: { common_core: true, ontario: true, cambridge: true, ncert: true, ib: true } }
    );

    for (let u = 0; u < grade.units.length; u++) {
      const unit = grade.units[u];
      const unitId = await getOrCreate(
        'units',
        { grade_id: gradeId, title: unit.title },
        { grade_id: gradeId, order_index: u + 1, title: unit.title, overview: `${unit.title} — parent overview placeholder.` }
      );

      for (let l = 0; l < unit.lessons.length; l++) {
        const title = unit.lessons[l];
        const slug = kebab(title);
        const lessonId = await getOrCreate(
          'lessons',
          { unit_id: unitId, slug },
          { unit_id: unitId, order_index: l + 1, slug, title, difficulty_level: 'core', summary: `${title} — summary for parents in ${grade.name}.` }
        );

        const t = tmpl(title, grade.name);
        for (let s = 0; s < SECTION_ORDER.length; s++) {
          const section_key = SECTION_ORDER[s];
          await getOrCreate(
            'lesson_sections',
            { lesson_id: lessonId, section_key },
            { lesson_id: lessonId, section_key, order_index: s + 1, markdown_content: t[section_key] }
          );
        }

        // 3 starter practice problems
        const starters = [
          { i: 1, q: `**Q1.** Starter for **${title}**.`, h: 'Hint: Try a household example.', a: 'Answer: Outline key steps.' },
          { i: 2, q: `**Q2.** Medium for **${title}** with real objects.`, h: 'Hint: Draw or act it out.', a: 'Answer: Short worked solution.' },
          { i: 3, q: `**Q3.** Challenge for **${title}**.`, h: 'Hint: Break it into parts.', a: 'Answer: Final result with reasoning.' },
        ];
        for (const p of starters) {
          await getOrCreate(
            'practice_problems',
            { lesson_id: lessonId, order_index: p.i },
            { lesson_id: lessonId, order_index: p.i, question_md: p.q, hint_md: p.h, answer_md: p.a }
          );
        }
      }
    }
  }

  console.log('✅ Seed complete.');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
