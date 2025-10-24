#!/usr/bin/env node
/**
 * Scaffolds lesson JSONs from a fixed list of slugs per grade
 * into /public/lessons/<grade>/<slug>.json using your schema:
 * { grade, unit:{title:"Core"}, lesson:{slug,title,...}, sectionsArray[], sections{}, practice }
 *
 * Usage:
 *   node scripts/scaffoldFromList.mjs
 *   node scripts/scaffoldFromList.mjs --overwrite   # to overwrite existing files
 */

import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'public', 'lessons');

const TITLE = (s) =>
  s
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());

const uuid = () => crypto.randomUUID();

const LESSONS = {
  // Kindergarten (k) — 28 Lessons
  k: [
    '2d-shapes-circle-triangle-square-rectangle',
    '3d-shapes-sphere-cube-cylinder-cone',
    'add-with-objects-stories',
    'coins-and-notes-recognize-no-calculations',
    'compare-numbers-to-10',
    'comparing-groups-more-less-equal',
    'counting-0-100',
    'counting-0-20',
    'counting-0-50',
    'introduction-to-addition-subtraction-through-stories',
    'introduction-to-coins-money-concept-only',
    'make-10-compositions-of-10',
    'measure-with-nonstandard-units',
    'measurement-length-weight-nonstandard-units',
    'number-bonds-to-10',
    'patterns-ab-aab-abb-abc',
    'patterns-repeating-sequences',
    'position-words-above-below-beside-inside-next-to',
    'position-words-above-below-beside-inside',
    'read-write-numbers-0-20',
    'real-world-math-through-play-toys-snacks-blocks',
    'recognizing-shapes-circle-square-triangle-rectangle',
    'sort-classify-shape-size-colour',
    'sorting-classifying-by-colour-shape-size',
    'subtract-with-objects-stories',
    'time-concepts-today-yesterday-tomorrow',
    'time-words-today-yesterday-tomorrow',
    'understanding-quantity-and-how-many',
  ],

  // Grade 1 — 30 Lessons
  1: [
    '2d-3d-shape-attributes',
    'add-subtract-within-100-no-regrouping',
    'add-within-20-strategies',
    'addition-subtraction-within-20',
    'count-to-120-read-write-to-120',
    'equal-groups-intro-to-multiplication',
    'even-and-odd-numbers',
    'fractions-halves-quarters',
    'graphs-tally-marks-pictographs',
    'halves-quarters-fractions-as-equal-shares',
    'introduction-to-multiplication-ideas-groups-of-2-5-10',
    'measure-length-nonstandard-centimetres',
    'measurement-length-weight-capacity',
    'numbers-to-100-skip-counting-2s-5s-10s',
    'patterns-increasing-and-decreasing',
    'picture-graphs-tally-charts',
    'place-value-tens-ones',
    'shapes-2d-3d-recognition-and-attributes',
    'simple-money-math-with-coins',
    'skip-counting-by-2s-5s-10s',
    'subtract-within-20-strategies',
    'tell-time-to-the-hour-and-half-hour',
    'time-hour-half-hour',
    'word-problems-add-subtract-within-20',
    'word-problems-with-pictures',
  ],

  // Grade 2 — 29 Lessons
  2: [
    'add-and-subtract-within-100-regrouping',
    'add-subtract-within-1000-concepts',
    'addition-subtraction-two-digit-numbers',
    'area-and-perimeter-informal',
    'fluency-with-2-digit-addition-subtraction',
    'fractions-1-2-1-3-1-4-as-equal-parts',
    'intro-to-division-sharing-grouping',
    'intro-to-multiplication-arrays-equal-groups',
    'length-cm-m-mass-g-kg-capacity-l',
    'measurement-cm-m-g-kg-l-time-to-5-minutes',
    'money-word-problems-up-to-5',
    'number-line-to-1000',
    'numbers-0-1000-place-value-hundreds',
    'odd-even-patterns',
    'picture-bar-graphs',
    'place-value-to-1000-hundreds-tens-ones',
    'rounding-intro',
    'shapes-symmetry-polygons-solids',
    'skip-counting-by-2s-3s-4s-5s-10s',
    'time-to-5-minutes',
  ],

  // Grade 3 — 28 Lessons
  3: [
    'angles-right-acute-obtuse-quadrilaterals',
    'area-of-rectangles-composite-figures',
    'bar-line-graphs',
    'compare-fractions-with-same-denominator-or-numerator',
    'divide-facts-to-100',
    'equivalent-fractions',
    'fractions-on-number-lines',
    'fractions-unit-fractions-on-number-lines',
    'geometry-angles-lines-quadrilaterals',
    'intro-to-decimals-tenths',
    'measurement-m-cm-l-g-time-to-minute',
    'multiplication-division-facts-to-10-10',
    'pattern-rules-growing-repeating',
    'perimeter-of-polygons',
    'place-value-to-10-000',
    'problem-solving-with-multiple-steps',
    'properties-of-operations',
    'time-to-the-minute-elapsed-time',
    'two-step-word-problems',
  ],

  // Grade 4 — 27 Lessons
  4: [
    'add-subtract-fractions-same-unlike-denominators',
    'angles-classification-of-shapes',
    'area-perimeter-volume-of-rectangular-prisms',
    'decimals-tenths-hundredths',
    'factors-multiples-prime-composite',
    'fractions-add-subtract-same-different-denominators',
    'fractions-equivalence-compare',
    'intro-to-probability-simple-events',
    'line-plots-data',
    'long-division-1-digit-divisors',
    'measurement-conversions',
    'mixed-numbers-improper-fractions',
    'multi-digit-addition-subtraction',
    'multi-digit-multiplication-long-division',
    'place-value-to-1-000-000',
    'rounding-estimating',
    'symmetry-transformations',
  ],

  // Grade 5 — 30 Lessons
  5: [
    'converting-fractions-decimals-percents',
    'coordinate-plane-1st-quadrant',
    'data-line-plots-averages-range',
    'decimal-operations-add-subtract-multiply-divide-by-10s',
    'divide-unit-fractions-and-whole-numbers-concepts',
    'fraction-addition-subtraction-unlike-denominators',
    'fractions-add-subtract-multiply-whole-numbers',
    'geometry-triangles-quadrilaterals-properties',
    'intro-to-ratio-rate',
    'line-plots-mean-median-mode-range-intro',
    'multiply-fractions-by-whole-numbers',
    'order-of-operations-pemdas',
    'powers-of-10-and-exponents-intro',
    'rates-ratios-intro',
    'simple-probability-predictions',
    'triangles-quadrilaterals-properties',
    'volume-and-surface-area-rectangular-prisms',
    'whole-numbers-to-millions',
  ],

  // Grade 6 — 28 Lessons
  6: [
    'all-decimal-operations',
    'area-surface-area-volume-cylinders-and-prisms-overview',
    'area-triangles-polygons-composite-figures',
    'compound-probability-intro',
    'coordinate-plane-all-quadrants',
    'data-statistics-mean-median-mode-range',
    'decimals-all-operations',
    'exponents-powers',
    'expressions-equations-one-variable',
    'fractions-divide-by-whole-numbers-fractions',
    'integers-on-number-line-absolute-value',
    'mean-median-mode-range-mad',
    'one-step-equations-inequalities',
    'percent-percentage-problems',
    'probability-of-compound-events',
    'ratios-rates-unit-rates',
    'statistical-questions-dot-box-plots-histograms',
    'unit-rates',
  ],

    // Grade 7 — 26 Lessons
  7: [
    'algebraic-expressions-combine-like-terms',
    'circles-circumference-area',
    'data-scatter-plots-correlation',
    'geometry-angles-triangles-similar-figures',
    'integer-operations',
    'introduction-to-functions-tables-graphs',
    'operations-with-rational-numbers-fractions-decimals',
    'percent-discount-tax-tip',
    'proportions-percent-problems-discount-tax-tip',
    'rates-in-real-life',
    'rational-numbers-fractions-decimals',
    'ratios-proportions',
    'real-life-signed-operations',
    'similar-figures-scale-drawings',
    'simple-compound-interest-intro',
    'solving-linear-equations-inequalities',
    'theoretical-vs-experimental-probability',
  ],

  // Grade 8 — 26 Lessons
  8: [
    'bivariate-data-line-of-best-fit',
    'compound-probability-trees-tables',
    'exponent-rules-scientific-notation',
    'functions-definition-evaluation',
    'graphing-lines-slope-intercept-form',
    'linear-equations-systems-of-equations',
    'polynomials-intro-to-addition-multiplication',
    'probability-of-compound-events',
    'pythagorean-theorem-applications',
    'real-numbers-rational-vs-irrational',
    'roots-radicals-simplify',
    'statistics-bivariate-data-line-of-best-fit',
    'systems-of-linear-equations-graph-substitution-elimination',
    'transformations-similarity-congruence',
    'volume-surface-area-cylinders-cones-spheres',
  ],

  // Grade 9 — 22 Lessons
  9: [
    'absolute-value',
    'exponential-functions-intro',
    'expressions-equations-inequalities',
    'factoring-techniques-intro',
    'function-notation-transformations',
    'functions-graphs-domain-range',
    'graphing-linear-functions',
    'linear-equations-inequalities-all-methods',
    'quadratic-solutions-factoring-formula-completing-square',
    'quadratics-forms-graphing-zeros',
    'radical-expressions-intro',
    'rational-expressions-intro',
    'real-number-properties',
    'slope-parallel-perpendicular-lines',
    'solving-linear-equations',
    'solving-quadratic-equations-intro',
    'systems-of-equations-inequalities',
    'word-problems-modeling',
  ],

  // Grade 10 — 21 Lessons
  10: [
    'area-perimeter-surface-area-volume',
    'circles-arcs-tangents-chords',
    'congruence-rigid-motions',
    'congruent-similar-triangles',
    'coordinate-geometry-distance-midpoint-partition',
    'logic-proofs-conjectures',
    'parallel-perpendicular',
    'points-lines-angles',
    'polygons-quadrilaterals',
    'right-triangle-trigonometry',
    'similarity-dilations-ratios',
    'transformations-symmetry',
  ],

  // Grade 11 — 17 Lessons
  11: [
    'complex-numbers-i-arithmetic',
    'conic-sections',
    'exponential-logarithmic-functions',
    'polynomial-functions-factoring',
    'probability-statistics-basics',
    'quadratic-functions-vertex-standard-factored',
    'rational-functions-asymptotes',
    'sequences-series-arithmetic-geometric',
    'systems-non-linear-2-var-3-var',
  ],

  // Grade 12 — 33 Lessons
  12: [
    'applications-of-derivatives-slope-optimization',
    'budgeting-financial-literacy',
    'correlation-regression',
    'data-visualization-modeling',
    'derivatives-differentiation-rules',
    'differential-equations-intro',
    'distributions-binomial-normal',
    'exponential-logarithmic-polynomial-rational-functions',
    'financial-math-simple-compound-interest-loans',
    'function-operations-composition',
    'fundamental-theorem-of-calculus',
    'hypothesis-testing-confidence-intervals',
    'integrals-area-under-a-curve',
    'limits-continuity',
    'loans-mortgages-savings-plans',
    'polar-coordinates-optional',
    'probability-rules-independent-conditional',
    'real-world-applications-physics-economics-motion',
    'sampling-methods-bias',
    'sequences-series-arithmetic-geometric',
    'simple-compound-interest',
    'spreadsheets-statistical-software-basics',
    'statistics-sampling-inference-intro',
    'trigonometry-unit-circle-identities-graphing',
    'vectors-parametric-equations',
  ],
};

const OVERWRITE = process.argv.includes('--overwrite');

function makeJson(grade, slug, i) {
  const gradeName = grade === 'k' ? 'Kindergarten' : `Grade ${grade}`;
  const title = TITLE(slug);
  return {
    grade: { id: uuid(), slug: String(grade), name: gradeName },
    unit: { id: uuid(), title: 'Core', order_index: 1 },
    lesson: {
      id: uuid(),
      slug,
      title,
      summary: `${title} — summary for parents in ${gradeName}.`,
      difficulty_level: 'core',
      order_index: i + 1,
    },
    sectionsArray: [
      { key: 'objectives', md: `Learning goals for **${title}** in ${gradeName}.`, order_index: 1 },
      { key: 'overview',   md: `Why **${title}** matters and how to support it at home.`, order_index: 2 },
      { key: 'core',       md: `Core idea of **${title}** with simple examples.`, order_index: 3 },
      { key: 'demo',       md: `Household activity to explore **${title}** using everyday items.`, order_index: 4 },
      { key: 'math',       md: `The math behind **${title}** explained for parents.`, order_index: 5 },
      { key: 'formulas',   md: `Key formulas or patterns related to **${title}**.`, order_index: 6 },
      { key: 'guide',      md: `Step-by-step guide to practice **${title}**.`, order_index: 7 },
      { key: 'practice',   md: `Practice Together: add 8–10 scaffolded questions here.`, order_index: 8 },
      { key: 'mistakes',   md: `Common mistakes and how to correct them for **${title}**.`, order_index: 9 },
      { key: 'connection', md: `Real-life connections to make **${title}** meaningful.`, order_index: 10 },
      { key: 'close',      md: `Positive close: celebrate progress and preview what's next.`, order_index: 11 },
    ],
    sections: {
      objectives: `Identify the core skills for **${title}**.`,
      overview: `This lesson helps children understand **${title}**.`,
      core: `Explain **${title}** in parent-friendly language.`,
      practice: `Add custom practice items here later.`,
    },
    practice: `Placeholder practice content for **${title}**.`,
  };
}

async function ensureDir(p) { await fs.mkdir(p, { recursive: true }); }
async function exists(p) { try { await fs.access(p); return true; } catch { return false; } }

async function main() {
  await ensureDir(OUT_DIR);
  let written = 0;
  for (const grade of Object.keys(LESSONS)) {
    const gradeDir = path.join(OUT_DIR, grade);
    await ensureDir(gradeDir);
    const list = LESSONS[grade];
    for (let i = 0; i < list.length; i++) {
      const slug = list[i];
      const filePath = path.join(gradeDir, `${slug}.json`);
      if (!OVERWRITE && (await exists(filePath))) {
        continue;
      }
      const body = makeJson(grade, slug, i);
      await fs.writeFile(filePath, JSON.stringify(body, null, 2), 'utf8');
      written++;
    }
  }
  console.log(`✅ Scaffolded ${written} lesson file(s)${written ? '' : ' (nothing new)'}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
