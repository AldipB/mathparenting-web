#!/usr/bin/env node
/**
 * Re-author lessons using data/lesson_spec.md (older spec), filling sectionsArray/sections.
 * Loads .env.local so OPENAI_API_KEY works without prefixing env on the command line.
 */

import path from 'path';
import { fileURLToPath } from 'url';

// Load .env.local
import dotenv from 'dotenv';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import { promises as fs } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');
const LESSONS_DIR = path.join(ROOT, 'public', 'lessons');
const SPEC_PATH = path.join(ROOT, 'data', 'lesson_spec.md');

const OPENAI_KEY = process.env.OPENAI_API_KEY || process.env.OPENAI_API_TOKEN;
if (!OPENAI_KEY) {
  console.error('❌ Missing OPENAI_API_KEY in .env.local (or environment). Add:\nOPENAI_API_KEY=sk-...');
  process.exit(1);
}

const args = process.argv.slice(2);
const getArg = (name, def=null) => {
  const a = args.find(x => x.startsWith(`--${name}=`));
  return a ? a.split('=')[1] : def;
};
const has = (name) => args.includes(`--${name}`);

const targetGrade = getArg('grade', null);
const only = getArg('only', null);
const limit = parseInt(getArg('limit', '0'), 10) || 0;
const model = getArg('model', 'gpt-4o-mini');
const temperature = parseFloat(getArg('temperature', '0.7')) || 0.7;
const dryRun = has('dry-run');

const systemMsg = 'You are a helpful education content writer.';
const spec = await fs.readFile(SPEC_PATH, 'utf8');

function wants(grade, slug) {
  if (only) {
    const m = only.match(/^grade=(k|\d{1,2}):(.+)$/i);
    if (!m) return false;
    const g = m[1].toLowerCase();
    const s = m[2].trim();
    return (String(grade).toLowerCase() === g) && slug === s;
  }
  if (targetGrade) return String(grade).toLowerCase() === String(targetGrade).toLowerCase();
  return true;
}

async function listTargets() {
  const out = [];
  const grades = (await fs.readdir(LESSONS_DIR, { withFileTypes: true }))
    .filter(d => d.isDirectory()).map(d => d.name);
  for (const g of grades) {
    const gPath = path.join(LESSONS_DIR, g);
    const files = (await fs.readdir(gPath)).filter(f => f.endsWith('.json') && !f.startsWith('_'));
    for (const f of files) {
      const slug = f.replace(/\.json$/, '');
      if (wants(g, slug)) out.push({ grade: g, slug, file: path.join(gPath, f) });
    }
  }
  return out;
}

function buildPrompt(data) {
  const gradeName = data.grade?.name ?? data.grade?.slug ?? '';
  const unitTitle = data.unit?.title ?? '';
  const lessonTitle = data.lesson?.title ?? data.lesson?.slug ?? '';
  return `
You are writing a concise, parent-friendly K–12 math lesson.

Grade: ${gradeName}
Unit: ${unitTitle}
Lesson Title: ${lessonTitle}

Write markdown for these named sections (keys in JSON):
- objectives
- overview
- core
- demo
- math
- formulas
- guide
- practice
- mistakes
- connection
- close

Rules:
- Be clear, warm, supportive. Avoid jargon unless explained.
- Use short paragraphs and lists.
- Include simple symbols using LaTeX for math when helpful (e.g., $a \\times b$).
- Keep total under ~600–900 words.
- Return JSON with those keys, values are markdown strings only.
`.trim();
}

async function callOpenAI(prompt) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      temperature,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemMsg },
        { role: 'user', content: prompt }
      ]
    })
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`OpenAI ${res.status}: ${txt}`);
  }
  const data = await res.json();
  try {
    return JSON.parse(data.choices[0].message.content);
  } catch {
    return null;
  }
}

function validateAuthored(obj) {
  const must = ['objectives','overview','core','demo','math','formulas','guide','practice','mistakes','connection','close'];
  return must.every(k => typeof obj?.[k] === 'string' && obj[k].trim().length > 10);
}

function mergeSections(existing, authored) {
  const keys = ['objectives','overview','core','demo','math','formulas','guide','practice','mistakes','connection','close'];
  const out = { ...existing };

  // sectionsArray (ordered)
  const order = (key) => ({
    objectives: 1, overview: 2, core: 3, demo: 4, math: 5, formulas: 6,
    guide: 7, practice: 8, mistakes: 9, connection: 10, close: 11
  })[key] ?? 999;

  out.sectionsArray = keys.map(k => ({ key: k, md: authored[k], order_index: order(k) }));
  out.sections = out.sections || {};
  for (const k of keys) out.sections[k] = authored[k];
  out.practice = authored.practice;
  out.markdown = keys.map(k => `## ${k[0].toUpperCase()+k.slice(1)}\n\n${authored[k]}`).join('\n\n');

  return out;
}

async function main() {
  const targets = await listTargets();
  if (!targets.length) { console.log('No matching lessons.'); return; }

  let processed = 0, authored = 0, skipped = 0;
  for (const t of targets) {
    if (limit && authored >= limit) break;

    const data = JSON.parse(await fs.readFile(t.file, 'utf8'));
    const prompt = buildPrompt(data);
    if (dryRun) { console.log(`[dry-run] ${t.grade}/${t.slug}`); processed++; continue; }

    try {
      const content = await callOpenAI(prompt);
      if (!validateAuthored(content)) { console.log(`⚠️  Incomplete content for ${t.grade}/${t.slug}`); skipped++; continue; }
      const merged = mergeSections(data, content);
      await fs.writeFile(t.file, JSON.stringify(merged, null, 2), 'utf8');
      console.log(`✍️  Authored: ${t.grade}/${t.slug}`);
      authored++;
    } catch (e) {
      console.log(`❌ ${t.grade}/${t.slug}: ${e.message}`);
      skipped++;
    }
    processed++;
  }
  console.log(`\nDone. Processed: ${processed}, Authored: ${authored}, Skipped: ${skipped}`);
}

main().catch(err => { console.error(err); process.exit(1); });
