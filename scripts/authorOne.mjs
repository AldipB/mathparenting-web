// scripts/authorOne.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import minimist from 'minimist';

dotenv.config({ path: ['.env.local', '.env'] });

const argv = minimist(process.argv.slice(2), {
  string: ['grade', 'title', 'model'],
  boolean: ['force', 'debug', 'loose', 'allow-fallback'],
  default: {
    model: 'gpt-4o',
    force: false,
    debug: false,
    loose: false,
    'allow-fallback': true,
    retries: 6,
  },
});

const gradeInput = (argv.grade ?? '').toString().trim();
const titleInput = (argv.title ?? '').toString().trim();
const model = argv.model;
const force = !!argv.force;
const debug = !!argv.debug;
const loose = !!argv.loose;
const allowFallback = !!argv['allow-fallback'];
const retries = Number(argv.retries ?? 6);

if (!process.env.OPENAI_API_KEY) {
  console.error('❌ Missing OPENAI_API_KEY. Put it in .env or run with: OPENAI_API_KEY=sk-xxxx node ...');
  process.exit(1);
}

if (!gradeInput) {
  console.error('❌ Missing --grade');
  process.exit(1);
}
if (!titleInput) {
  console.error('❌ Missing --title');
  process.exit(1);
}

// Minimal slug + paths (no curriculum needed)
function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_ROOT =
  process.env.LESSON_OUT_DIR || path.join(__dirname, '..', 'content', 'lessons');

const gradeKey = String(gradeInput);
const slug = slugify(titleInput);
const outDir = path.join(OUTPUT_ROOT, gradeKey);
const outPath = path.join(outDir, `${slug}.json`);
const mdPath = path.join(outDir, `${slug}.md`);

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function existsAny() {
  return fs.existsSync(outPath) || fs.existsSync(mdPath);
}

// Your pipeline (unchanged)
import {
  draftLesson,
  validateDraft,
  maybeFallback,
  persistDraft,
} from './lib/authoringPipeline.mjs';

(async function run() {
  // Create a plain topic object so we can bypass curriculum.mjs entirely
  const topic = {
    title: titleInput,
    gradeKey,
    gradeLabel: gradeKey.match(/^k$/i) ? 'Kindergarten (K)' : `Grade ${gradeKey}`,
  };

  console.log(
    `Authoring ONE topic… ${topic.gradeLabel} — ${topic.title} ${force ? '(force overwrite) ' : ''}${allowFallback ? '' : '(no-fallback)'}`
  );

  if (!force && existsAny()) {
    console.log('→ Output already exists. Use --force to overwrite.');
    return;
  }

  try {
    const draft = await draftLesson({ topic, model, retries, loose, debug });

    const ok = await validateDraft(draft, { loose, debug });
    if (!ok) {
      if (!allowFallback) {
        console.log('↳ Validation failed (no-fallback mode). Nothing written.');
        return;
      }
      const fb = await maybeFallback(topic, { debug });
      if (!fb) {
        console.log('❌ Fallback failed. Nothing written.');
        return;
      }
      await writeOut(fb);
      console.log('✅ Saved (fallback).');
      return;
    }

    await writeOut(draft);
    console.log('✅ Saved.');
  } catch (e) {
    console.error('❌ Error:', e?.message || e);
  }

  async function writeOut(draft) {
    ensureDir(outDir);
    await persistDraft(draft, outPath); // writes JSON (your existing writer)
    // If you also want .md, uncomment next two lines:
    // const md = draft?.markdown ?? draft?.content ?? '';
    // if (md) fs.writeFileSync(mdPath, typeof md === 'string' ? md : JSON.stringify(md, null, 2));
  }
})();
