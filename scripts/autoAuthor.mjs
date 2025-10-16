// scripts/autoAuthor.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import minimist from 'minimist';

// --- env ---
dotenv.config({ path: ['.env.local', '.env'] });

// --- argv ---
const argv = minimist(process.argv.slice(2), {
  boolean: ['force', 'loose', 'debug', 'only-missing', 'allow-fallback'],
  string: ['grade', 'model', 'topic-title'],
  default: {
    force: false,
    loose: false,
    debug: false,
    'only-missing': false,
    'allow-fallback': true,
    model: 'gpt-4o',
    retries: 3,
  },
});

const force = argv.force;
const loose = argv.loose;
const debug = argv.debug;
const model = argv.model;
const retries = Number(argv.retries ?? 3);
const onlyMissing = argv['only-missing'];
const allowFallback = argv['allow-fallback'];
const requestedTitle = (argv['topic-title'] || '').trim();

const log = (...a) => console.log(...a);
const dbg = (...a) => debug && console.log('[debug]', ...a);

// --- paths/config ---
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_ROOT =
  process.env.LESSON_OUT_DIR || path.join(__dirname, '..', 'content', 'lessons');
const OUTPUT_EXTS = ['.json', '.md'];

// --- utils ---
function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}
function normalizeTitle(s = '') {
  return String(s)
    .toLowerCase()
    .replace(/[\u2012\u2013\u2014\u2212]/g, '-') // various dashes → hyphen
    .replace(/\s+/g, ' ')
    .trim();
}
function outPaths(gradeKey, topicTitle) {
  const gradeDir = path.join(OUTPUT_ROOT, gradeKey);
  const slug = slugify(topicTitle);
  return OUTPUT_EXTS.map((ext) => path.join(gradeDir, `${slug}${ext}`));
}
function existsAny(paths) {
  return paths.some((p) => fs.existsSync(p));
}
function ensureDirFor(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// --- curriculum & pipeline ---
import { topicsForGrade } from './curriculum.mjs';
import { draftLesson, validateDraft, maybeFallback, persistDraft } from './lib/authoringPipeline.mjs';

// Try hard to resolve the user's grade input to whatever the curriculum uses
function normalizeGradeInput(gradeRaw) {
  if (!gradeRaw && gradeRaw !== 0) return null;
  const g = String(gradeRaw).trim();

  // canonical numeric grades
  const num = Number(g);
  if (!Number.isNaN(num) && num >= 1 && num <= 12) return String(num);

  // kindergarten aliases
  const kAliases = ['k', 'K', '0', 'kg', 'kinder', 'kindergarten', 'k-grade', 'kinder garten'];
  if (kAliases.includes(g) || kAliases.includes(g.toLowerCase())) return 'K';

  // otherwise pass through as-is
  return g;
}

// If curriculum uses a different key (e.g., 'Kindergarten' or 'k'),
// try a set of likely aliases until some topics appear.
function topicsForGradeSmart(gradeRaw) {
  const tried = new Set();
  const suggestions = [];

  const primary = normalizeGradeInput(gradeRaw);
  const kCandidates = ['K', 'k', '0', 'Kindergarten', 'kindergarten'];
  const numCandidates = Array.from({ length: 12 }, (_, i) => String(i + 1));

  const candidates = new Set([
    primary,
    ...(primary === 'K' ? kCandidates : []),
    ...(numCandidates.includes(primary) ? [primary] : []),
  ]);

  for (const key of candidates) {
    if (!key || tried.has(key)) continue;
    tried.add(key);
    try {
      const list = topicsForGrade(key) || [];
      if (Array.isArray(list) && list.length > 0) {
        return { gradeKey: key, topics: list };
      }
      suggestions.push({ gradeKey: key, count: list.length || 0 });
    } catch {
      suggestions.push({ gradeKey: key, count: 0 });
    }
  }

  // As a last resort, probe a handful of well-known keys to help the user
  for (const key of ['K', 'k', '0', 'Kindergarten', '1', '2', '3']) {
    if (tried.has(key)) continue;
    tried.add(key);
    try {
      const list = topicsForGrade(key) || [];
      if (Array.isArray(list) && list.length > 0) {
        return { gradeKey: key, topics: list };
      }
      suggestions.push({ gradeKey: key, count: list.length || 0 });
    } catch {
      suggestions.push({ gradeKey: key, count: 0 });
    }
  }

  return { gradeKey: primary || String(gradeRaw), topics: [], suggestions };
}

async function run() {
  // resolve grade smartly
  const { gradeKey, topics, suggestions } = topicsForGradeSmart(argv.grade);

  if (!topics || topics.length === 0) {
    console.log(`No topics found for grade key "${gradeKey}".`);
    if (suggestions?.length) {
      const hint = suggestions.map(s => `${s.gradeKey} (${s.count})`).join(', ');
      console.log('Tried keys:', hint);
    }
    console.log('Tip: Try --grade=K or --grade=1..12 (aliases like "kindergarten" and "0" are accepted).');
    return;
  }

  // If a topic title is specified, find it by normalized match
  let selected = topics;
  if (requestedTitle) {
    const normReq = normalizeTitle(requestedTitle);
    selected = topics.filter(t => normalizeTitle(t.title) === normReq);

    if (selected.length === 0) {
      console.log(`No topic matched --topic-title="${requestedTitle}" for grade ${gradeKey}.`);
      if (topics.length) {
        console.log('Available titles:\n  - ' + topics.map(t => t.title).join('\n  - '));
      } else {
        console.log('(No topics returned by curriculum for this grade.)');
      }
      console.log('Tip: matching ignores case, dash variations, and extra spaces.');
      return;
    }
  }

  log(`Authoring content for grade ${gradeKey}… ${force ? '(force overwrite) ' : ''}${allowFallback ? '' : '(no-fallback)'}`);

  let processed = 0, saved = 0, skipped = 0, failed = 0, usedFallback = 0;

  for (const topic of selected) {
    const titleForLog = `${topic.gradeLabel ?? gradeKey} — ${topic.title}`;
    const outputs = outPaths(gradeKey, topic.title);

    // Early-skip guard
    if (onlyMissing && !force && existsAny(outputs)) {
      skipped++;
      dbg(`skip-early: exists → ${titleForLog}`);
      log(`→ ${titleForLog}\n   ↳ Skipping (already exists; --only-missing).`);
      continue;
    }

    processed++;
    log(`→ Drafting: ${titleForLog}`);

    try {
      const draft = await draftLesson({ topic, model, retries, loose, debug });

      const ok = await validateDraft(draft, { loose, debug });
      if (!ok) {
        if (!allowFallback) {
          skipped++;
          log(`   ↳ Skipping "${topic.title}" (no-fallback mode).`);
          continue;
        }
        const fb = await maybeFallback(topic, { debug });
        if (!fb) {
          failed++;
          log(`❌ Error on "${topic.title}": fallback failed`);
          continue;
        }
        usedFallback++;
        await persist(fb, topic, gradeKey);
        continue;
      }

      await persist(draft, topic, gradeKey);
    } catch (e) {
      failed++;
      log(`❌ Error on "${topic.title}": ${e?.message || e}`);
    }
  }

  log(`✅ Done. Processed: ${processed}, Saved/Updated: ${saved}, Skipped: ${skipped}, Failed: ${failed}, Fallback used: ${usedFallback}`);

  async function persist(draft, topic, gradeKey) {
    const primaryPath = outPaths(gradeKey, topic.title)[0]; // first ext (usually .json)
    ensureDirFor(primaryPath);
    await persistDraft(draft, primaryPath);
    saved++;
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
