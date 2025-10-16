// scripts/upgradeSections.mjs
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
if (!url || !key) throw new Error('Missing env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');

const db = createClient(url, key, { auth: { persistSession: false } });

const NEW_SECTIONS = [
  {
    key: 'objectives',
    title: 'Learning Objectives',
    order: 1,
    md:
`**By the end of this lesson, your child will be able to…**
- 
- 

**Why this matters for parents:**
- `
  },
  {
    key: 'formulas',
    title: 'Formula Section',
    order: 6,
    md:
`> If this topic uses formulas, list them clearly here.

**Key formula(s):**
- $ $

_(If this lesson doesn't require a formula, you can keep this section empty.)_`
  },
  {
    key: 'formula_glossary',
    title: 'What Each Symbol Means',
    order: 7,
    md:
`**Symbol meanings:**
- $ $ = 
- $ $ = 

Explain symbols in plain language parents can repeat to kids.`
  },
];

async function getAllLessons() {
  const { data, error } = await db.from('lessons').select('id, title');
  if (error) throw error;
  return data || [];
}

async function sectionExists(lesson_id, section_key) {
  const { data, error } = await db
    .from('lesson_sections')
    .select('id')
    .eq('lesson_id', lesson_id)
    .eq('section_key', section_key)
    .maybeSingle();
  if (error && error.code !== 'PGRST116') throw error;
  return !!data?.id;
}

async function createSection(lesson_id, section_key, order_index, markdown_content) {
  const { error } = await db.from('lesson_sections').insert({
    lesson_id,
    section_key,
    order_index,
    markdown_content,
  });
  if (error) throw error;
}

async function run() {
  console.log('Upgrading lessons with new sections…');

  const lessons = await getAllLessons();
  let added = 0;

  for (const L of lessons) {
    for (const s of NEW_SECTIONS) {
      const exists = await sectionExists(L.id, s.key);
      if (!exists) {
        await createSection(L.id, s.key, s.order, s.md);
        added++;
      }
    }
  }

  console.log(`✅ Upgrade complete. New sections added: ${added}`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
