#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');
const LESSONS_DIR = path.join(ROOT, 'public', 'lessons');

const must = ['objectives','overview','core','demo','math','formulas','guide','practice','mistakes','connection','close'];

function ok(s){ return typeof s==='string' && s.trim().length >= 10; }

async function main() {
  const grades = (await fs.readdir(LESSONS_DIR, { withFileTypes: true })).filter(d=>d.isDirectory()).map(d=>d.name);
  let bad = 0, total = 0;

  for (const g of grades) {
    const files = (await fs.readdir(path.join(LESSONS_DIR, g))).filter(f=>f.endsWith('.json') && !f.startsWith('_'));
    for (const f of files) {
      total++;
      const full = path.join(LESSONS_DIR, g, f);
      const data = JSON.parse(await fs.readFile(full,'utf8'));
      const errs = [];
      for (const k of must) {
        const inArray = (data.sectionsArray || []).find((s)=>s.key===k)?.md;
        const inObj = data.sections?.[k];
        if (!ok(inArray) && !ok(inObj)) errs.push(k);
      }
      if (errs.length) {
        bad++;
        console.log(`⚠️  ${g}/${f}: missing/short → ${errs.join(', ')}`);
      }
    }
  }
  if (bad) {
    console.log(`\n${bad}/${total} files need work.`);
    process.exit(1);
  } else {
    console.log(`✅ All ${total} files pass basic QA.`);
  }
}
main().catch(e=>{ console.error(e); process.exit(1); });
