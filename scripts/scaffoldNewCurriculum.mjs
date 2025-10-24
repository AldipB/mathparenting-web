#!/usr/bin/env node
/**
 * Overwrite /public/lessons with the NEW curriculum the user specified.
 * - Creates /public/lessons/<grade>/<slug>.json
 * - Preserves your schema { grade, unit, lesson, sectionsArray, sections, practice }
 * - Parent-focused placeholders (short), ready for authoring later.
 *
 * Usage:
 *   node scripts/scaffoldNewCurriculum.mjs
 *   node scripts/scaffoldNewCurriculum.mjs --backup   (zip backup to /public/lessons_backup_YYYYMMDD_HHMM.zip)
 *   node scripts/scaffoldNewCurriculum.mjs --dry-run  (show plan, do not write)
 */

import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, "..");
const OUT_DIR = path.join(ROOT, "public", "lessons");

const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const DO_BACKUP = args.includes("--backup");

const uuid = () => crypto.randomUUID();
const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\s\-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/\-+/g, "-")
    .replace(/^\-|\-$/g, "");

const titleize = (s) =>
  s
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ""))
    .join(" ");

function makeLessonJson(gradeKey, gradeName, unitTitle, title, orderIndex) {
  // Parent-focused light placeholders; your author script can overwrite later.
  const objectives = `Parents will help their child understand **${title}** with simple language and hands-on examples.`;
  const overview = `This lesson explains **${title}** in everyday terms so you can guide your child with confidence.`;
  const core = `Core idea of **${title}** with a short story or visual your child can follow.`;
  const demo = `Try a quick household activity to explore **${title}** using common items.`;
  const math = `Parent-friendly explanation of the math behind **${title}**. Use small numbers first, add symbols later.`;
  const formulas = `If a formula applies, show it simply (e.g., use LaTeX: $a+b$, $a\\times b$).`;
  const guide = `1) Read the example together.\n2) Ask: “What do you notice?”\n3) Try one more example.\n4) Praise effort and clear thinking.`;
  const practice = `**Practice Together (3)**\n1) Mini example #1\n2) Mini example #2\n3) Mini example #3`;
  const mistakes = `- Rushing steps.\n- Mixing terms.\n- Not checking units/counts.`;
  const connection = `Spot **${title}** in daily life (kitchen, shopping, toys, time).`;
  const close = `Celebrate progress and preview what comes next.`;

  const map = {
    objectives,
    overview,
    core,
    demo,
    math,
    formulas,
    guide,
    practice,
    mistakes,
    connection,
    close,
  };
  const order = {
    objectives: 1,
    overview: 2,
    core: 3,
    demo: 4,
    math: 5,
    formulas: 6,
    guide: 7,
    practice: 8,
    mistakes: 9,
    connection: 10,
    close: 11,
  };

  const sectionsArray = Object.entries(map).map(([k, md]) => ({
    key: k,
    md,
    order_index: order[k],
  }));

  return {
    grade: { id: uuid(), slug: String(gradeKey), name: gradeName },
    unit: { id: uuid(), title: unitTitle, order_index: 1 },
    lesson: {
      id: uuid(),
      slug: slugify(title),
      title,
      summary: `${title} — parent overview for ${gradeName}.`,
      difficulty_level: "core",
      order_index: orderIndex,
    },
    sectionsArray,
    sections: map,
    practice: practice,
  };
}

// ===== NEW CURRICULUM (your outline) =======================================
const CURRICULUM = {
  k: {
    name: "Kindergarten",
    units: {
      "Number Sense & Counting": [
        "Counting 0–10",
        "Counting 0–20",
        "Counting 0–50",
        "Counting 0–100",
        "Compare numbers to 10",
        "Number bonds to 10",
        "Make 10 (compositions of 10)",
        "Addition through stories",
        "Subtraction through stories",
        "Read & write numbers 0–20",
      ],
      "Shapes & Geometry": [
        "2D shapes (circle, triangle, square, rectangle)",
        "3D shapes (sphere, cube, cylinder, cone)",
        "Recognizing & sorting shapes",
        "Position words (above, below, beside, inside, next to)",
        "Patterns (AB, AAB, ABB, ABC)",
      ],
      "Measurement & Data": [
        "Measure with non-standard units",
        "Compare length & weight",
        "Sort & classify objects",
        "Introduction to time (morning/afternoon/night)",
        "Recognize coins & notes (concept only)",
      ],
      "Real-World Math": [
        "Math through play (toys, snacks, blocks)",
        "Everyday counting at home",
      ],
    },
  },

  1: {
    name: "Grade 1",
    units: {
      "Core Skills": [
        "Addition & subtraction within 20",
        "Place value (ones & tens)",
        "Skip counting by 2s, 5s, 10s",
        "Comparing numbers (<, >, =)",
        "Basic word problems",
        "Fractions as halves & quarters",
        "Time to hour and half-hour",
        "Money (coins & notes – simple addition)",
        "Shapes & attributes",
        "Organize data in pictographs",
      ],
    },
  },

  2: {
    name: "Grade 2",
    units: {
      "Core Skills": [
        "Addition & subtraction within 100",
        "Regrouping (carry & borrow)",
        "Place value (hundreds)",
        "Intro to multiplication (repeated addition)",
        "Simple division (sharing concept)",
        "Even & odd numbers",
        "Fractions (½, ⅓, ¼)",
        "Measurement (length, mass, capacity)",
        "Telling time to 5 minutes",
        "Bar graphs & simple data",
      ],
    },
  },

  3: {
    name: "Grade 3",
    units: {
      "Core Skills": [
        "Multiplication facts (0–10)",
        "Division facts (0–10)",
        "Word problems 4-operations",
        "Rounding & estimating",
        "Fractions on number line",
        "Area & perimeter of rectangles",
        "Introduction to angles",
        "Money (change & total)",
        "Pictographs & bar graphs",
        "Intro to patterns & sequences",
      ],
    },
  },

  4: {
    name: "Grade 4",
    units: {
      "Core Skills": [
        "Multi-digit addition & subtraction",
        "Multiplication up to 4 digits",
        "Division with remainders",
        "Factors & multiples",
        "Equivalent fractions",
        "Adding & subtracting fractions",
        "Decimals (tenths & hundredths)",
        "Metric measurement (cm, m, L, kg)",
        "Area, perimeter & volume intro",
        "Line & symmetry",
      ],
    },
  },

  5: {
    name: "Grade 5",
    units: {
      "Core Skills": [
        "Multiplying fractions & decimals",
        "Dividing whole numbers by 1-digit",
        "LCM & GCF",
        "Mixed numbers & improper fractions",
        "Place value to millions",
        "Coordinate plane basics",
        "Geometry – triangles & quadrilaterals",
        "Volume & capacity",
        "Graphs (bar, line, pie)",
        "Introduction to ratios & rates",
      ],
    },
  },

  6: {
    name: "Grade 6",
    units: {
      "Core Skills": [
        "Long division & multi-digit multiplication",
        "Fractions – all operations",
        "Decimals – all operations",
        "Percentages (basic concept & conversion)",
        "Ratios & rates",
        "Coordinate plane (4 quadrants)",
        "Area & volume (3D shapes)",
        "Mean, median, mode & range",
        "Intro to variables & expressions",
      ],
    },
  },

  7: {
    name: "Grade 7",
    units: {
      "Core Skills": [
        "Integer operations (+ – × ÷)",
        "Rational numbers & number lines",
        "Proportions & percent applications",
        "Algebraic expressions & simplification",
        "Solving 1-step & 2-step equations",
        "Geometry – angles, triangles, circles",
        "Surface area & volume",
        "Probability & statistics basics",
        "Scale drawings & ratios",
      ],
    },
  },

  8: {
    name: "Grade 8",
    units: {
      "Core Skills": [
        "Exponents & powers",
        "Scientific notation",
        "Linear equations & graphing",
        "Slope & y-intercept",
        "Systems of equations (intro)",
        "Pythagorean Theorem (with proof)",
        "Transformations (reflect, rotate, translate, dilate)",
        "Volume of cylinders & cones",
        "Data analysis & scatter plots",
      ],
    },
  },

  9: {
    name: "Grade 9 (Algebra I / Foundations)",
    units: {
      "Core Skills": [
        "Real numbers & properties",
        "Linear functions and graphs",
        "Slope-intercept & standard form",
        "Systems of linear equations (substitution & elimination)",
        "Polynomials – add/subtract/multiply",
        "Factoring trinomials",
        "Quadratic functions & graphing",
        "Radicals & square roots",
        "Rational expressions (simplify & operate)",
      ],
    },
  },

  10: {
    name: "Grade 10 (Geometry & Algebra II)",
    units: {
      "Core Skills": [
        "Congruence & similarity",
        "Parallel lines & angle relationships",
        "Circle theorems",
        "Coordinate geometry",
        "Quadratic equations & formula",
        "Functions & transformations",
        "Exponential & logarithmic intro",
        "Sequences & series (arithmetic/geometric)",
        "Probability & combinatorics",
      ],
    },
  },

  11: {
    name: "Grade 11 (Advanced Functions & Trigonometry)",
    units: {
      "Core Skills": [
        "Polynomial functions (degree 2–5)",
        "Rational functions (domain & asymptotes)",
        "Exponential & logarithmic functions",
        "Trigonometric ratios & identities",
        "Unit circle & radian measure",
        "Law of sines & cosines",
        "Trig graphs & transformations",
        "Inverse functions",
        "Intro to complex numbers",
        "Data modelling & curve fitting",
      ],
    },
  },

  12: {
    name: "Grade 12 (Pre-Calculus & Calculus Foundations)",
    units: {
      "Core Skills": [
        "Limits & continuity",
        "Derivatives – rules & applications",
        "Slope of a curve & rate of change",
        "Optimization & related rates",
        "Integrals – area under curve",
        "Differential equations (intro)",
        "Sequences & series (sigma notation)",
        "Probability distributions (normal, binomial)",
        "Statistics – correlation & regression",
        "Financial math (simple & compound interest)",
        "Matrices & vectors (basics & operations)",
      ],
    },
  },
};
// ===========================================================================

async function backupIfRequested() {
  if (!DO_BACKUP) return;
  const now = new Date();
  const stamp = now
    .toISOString()
    .slice(0, 16)
    .replace(/[:-]/g, "")
    .replace("T", "_");
  const zipName = `lessons_backup_${stamp}.zip`;
  const zipPath = path.join(ROOT, "public", zipName);

  try {
    await fs.access(OUT_DIR);
  } catch {
    console.log("No existing public/lessons to back up.");
    return;
  }

  // Minimal zip via "best effort" (no external deps). If fs.zip not available in your env, skip.
  try {
    // Node doesn't have native zip; we’ll do a simple folder copy instead to /public/_backup_<stamp>/
    const destDir = path.join(ROOT, "public", `_backup_${stamp}`);
    await copyDir(OUT_DIR, destDir);
    console.log(`📦 Backup folder created: public/_backup_${stamp}/ (manual zip if you want)`);
  } catch (e) {
    console.log(`⚠️ Backup fallback failed: ${e.message}`);
  }
}

async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) await copyDir(s, d);
    else await fs.copyFile(s, d);
  }
}

async function rimraf(dir) {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch {}
}

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

async function main() {
  if (DRY) console.log("🔎 DRY RUN — no files will be written.\n");

  if (!DRY) await backupIfRequested();
  if (!DRY) await rimraf(OUT_DIR);
  if (!DRY) await ensureDir(OUT_DIR);

  let total = 0;
  for (const [gradeKey, cfg] of Object.entries(CURRICULUM)) {
    const gDir = path.join(OUT_DIR, String(gradeKey));
    if (!DRY) await ensureDir(gDir);

    for (const [unitTitle, titles] of Object.entries(cfg.units)) {
      for (let i = 0; i < titles.length; i++) {
        const lessonTitle = titles[i];
        const fileName = `${slugify(lessonTitle)}.json`;
        const filePath = path.join(gDir, fileName);
        const doc = makeLessonJson(String(gradeKey), cfg.name, unitTitle, lessonTitle, i + 1);

        if (DRY) {
          console.log(`[plan] ${gradeKey}/${fileName}  ←  ${cfg.name} / ${unitTitle} / #${i + 1}`);
        } else {
          await fs.writeFile(filePath, JSON.stringify(doc, null, 2), "utf8");
        }
        total++;
      }
    }
  }

  console.log(`\n✅ ${DRY ? "Would create" : "Created"} ${total} lessons under /public/lessons`);
  console.log(`   Grades scaffolded: ${Object.keys(CURRICULUM).join(", ")}`);
  console.log(`   Next: npm run lessons:index`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
