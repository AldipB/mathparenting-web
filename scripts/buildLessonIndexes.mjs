#!/usr/bin/env node
/**
 * Build lightweight indexes for lessons under /public/lessons
 * - Writes:
 *    - /public/lessons/_grades.json
 *    - /public/lessons/<grade>/_index.json
 * - Title priority:
 *    1) data.lesson.title
 *    2) data.title / data.topic / data.name / data.heading
 *    3) First Markdown heading found in known fields or sectionsArray[*].md
 *    4) Prettified slug (UUID/hex/numeric tails removed)
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.join(__dirname, '..');
const LESSONS_DIR = path.join(ROOT, 'public', 'lessons');

// Full UUID pattern (8-4-4-4-12 hex groups)
const UUID_RE = /\b[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}\b/gi;
// Very long pure numbers (timestamps etc.)
const LONG_NUM_RE = /\b\d{7,}\b/g;

function gradeRank(g) {
  return g.toLowerCase() === 'k' ? -1 : Number(g) || 0;
}

function titleCase(s) {
  return s
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(w => (w ? w[0].toUpperCase() + w.slice(1) : ''))
    .join(' ');
}

function firstHeading(md) {
  if (typeof md !== 'string') return undefined;
  const m = md.match(/^\s*#{1,3}\s+(.+)$/m);
  return m?.[1]?.trim();
}

function stripUuidishFromSlug(slug) {
  // Remove full UUIDs, long numbers, then drop trailing short hex crumbs
  let out = slug.replace(UUID_RE, ' ').replace(LONG_NUM_RE, ' ');
  out = out
    .split('-')
    .filter(seg => !/^[a-f0-9]{3,}$/i.test(seg)) // drop hex-ish crumbs like 1c52/ac70
    .join('-');
  return out;
}

function prettyFromSlug(slug) {
  const cleaned = stripUuidishFromSlug(slug)
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return titleCase(cleaned || slug.replace(/[-_]/g, ' '));
}

function bestTitle(data, slug) {
  // 1) Your schema: nested lesson.title
  const lessonTitle = data?.lesson?.title;
  if (typeof lessonTitle === 'string' && lessonTitle.trim()) return lessonTitle.trim();

  // 2) Other common title-ish fields
  for (const k of ['title', 'topic', 'name', 'heading']) {
    const v = data?.[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }

  // 3) First heading inside known fields
  for (const k of ['markdown', 'content', 'body', 'overview', 'core', 'guide', 'text', 'html']) {
    const v = data?.[k];
    if (typeof v === 'string') {
      const h = firstHeading(v);
      if (h) return h;
    } else if (Array.isArray(v)) {
      for (const item of v) {
        if (typeof item === 'string') {
          const h = firstHeading(item);
          if (h) return h;
        } else if (item && typeof item.markdown === 'string') {
          const h = firstHeading(item.markdown);
          if (h) return h;
        }
      }
    }
  }

  // 3b) Look into sectionsArray[*].md for a heading
  if (Array.isArray(data?.sectionsArray)) {
    for (const s of data.sectionsArray) {
      const md = typeof s?.md === 'string' ? s.md : '';
      const h = firstHeading(md);
      if (h) return h;
    }
  }

  // 4) Fallback to prettified slug
  return prettyFromSlug(slug);
}

async function safeJsonRead(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function main() {
  // Ensure lessons dir exists
  try {
    await fs.mkdir(LESSONS_DIR, { recursive: true });
  } catch {}

  // Collect grade directories
  const entries = await fs.readdir(LESSONS_DIR, { withFileTypes: true });
  const gradeDirs = entries.filter(e => e.isDirectory()).map(d => d.name);

  // Root grades index
  const grades = gradeDirs.sort((a, b) => gradeRank(a) - gradeRank(b));
  await fs.writeFile(
    path.join(LESSONS_DIR, '_grades.json'),
    JSON.stringify({ grades }, null, 2)
  );

  // Per-grade indexes
  for (const g of gradeDirs) {
    const gPath = path.join(LESSONS_DIR, g);
    const files = (await fs.readdir(gPath)).filter(
      f => f.endsWith('.json') && !f.startsWith('_')
    );

    const items = [];
    for (const f of files) {
      const slug = f.replace(/\.json$/, '');
      const full = path.join(gPath, f);
      const data = await safeJsonRead(full);

      // Choose best title
      const title = data ? bestTitle(data, slug) : prettyFromSlug(slug);

      items.push({ slug, title });
    }

    // Sort by title for stable browsing
    items.sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true }));

    await fs.writeFile(
      path.join(gPath, '_index.json'),
      JSON.stringify({ grade: g, lessons: items }, null, 2)
    );
  }

  console.log('✅ Rebuilt lesson indexes (clean titles, UUIDs stripped, lesson.title preferred)');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
