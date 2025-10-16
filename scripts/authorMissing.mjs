// scripts/authorMissing.mjs
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config({ path: ['.env.local', '.env'] });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_ROOT = process.env.LESSON_OUT_DIR || path.join(__dirname, '..', 'content', 'lessons');

// Where topics come from
import { topicsForGrade } from './curriculum.mjs';

const GRADES = ['k','1','2','3','4','5','6','7','8','9','10','11','12'];

function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function outPaths(gradeKey, topicTitle) {
  const gradeDir = path.join(OUTPUT_ROOT, gradeKey);
  const slug = slugify(topicTitle);
  return [
    path.join(gradeDir, `${slug}.json`),
    path.join(gradeDir, `${slug}.md`),
  ];
}

function existsAny(paths) {
  return paths.some((p) => fs.existsSync(p));
}

for (const g of GRADES) {
  console.log(`\n===== MISSING ONLY GRADE ${g} =====`);
  const topics = topicsForGrade(g);
  let missing = [];

  for (const t of topics) {
    const outputs = outPaths(g, t.title);
    if (!existsAny(outputs)) {
      missing.push(t.title);
    }
  }

  if (missing.length === 0) {
    console.log('Nothing missing. ✅');
    continue;
  }

  // Draft each missing topic individually to avoid drafting the whole grade
  for (const topicTitle of missing) {
    console.log(`→ Drafting missing: [${g}] ${topicTitle}`);
    const cmd = [
      'node',
      'scripts/autoAuthor.mjs',
      `--grade=${g}`,
      `--topic-title=${JSON.stringify(topicTitle)}`, // quotes safe
      '--only-missing=true',       // early skip guard inside autoAuthor (no-op here but ok)
      '--model=gpt-4o',
      '--retries=5',
      '--loose=true',
      '--debug=false',
      '--allow-fallback=false'     // change to true if you want auto fallback content
    ].join(' ');

    try {
      execSync(cmd, { stdio: 'inherit' });
    } catch (err) {
      console.error('  x Failed:', err?.message || err);
    }
  }
}

console.log('\n✅ author:missing done.');
