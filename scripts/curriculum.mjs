// scripts/curriculum.mjs
// A thin, resilient wrapper so the rest of the tooling can always call `topicsForGrade(gradeKey)`
// regardless of how your curriculum data file is structured.

import * as src from './curriculumdata.mjs';

const GRADE_LABELS = {
  k: 'Kindergarten (K)',
  '1': 'Grade 1',
  '2': 'Grade 2',
  '3': 'Grade 3',
  '4': 'Grade 4',
  '5': 'Grade 5',
  '6': 'Grade 6',
  '7': 'Grade 7',
  '8': 'Grade 8',
  '9': 'Grade 9',
  '10': 'Grade 10',
  '11': 'Grade 11',
  '12': 'Grade 12',
};

function labelFromKey(key) {
  const k = String(key).toLowerCase();
  return GRADE_LABELS[k] ?? `Grade ${k.toUpperCase()}`;
}

/**
 * Normalize a single topic record to the shape the authoring pipeline expects.
 * Expected fields at minimum: { title, gradeLabel }
 */
function normalizeTopic(t, gradeKey) {
  const obj = t && typeof t === 'object' ? { ...t } : { title: String(t || '').trim() };
  if (!obj.title) obj.title = 'Untitled Topic';
  if (!obj.gradeLabel) obj.gradeLabel = labelFromKey(gradeKey);
  return obj;
}

/**
 * Get topics for a grade key (`k`, `1`, …, `12`) regardless of the source export style.
 * Supported source shapes (any one of):
 * - function export:   topicsForGrade(gradeKey) -> Topic[]
 * - object export:     CURRICULUM / curriculum / default: { [gradeKey]: Topic[] }
 */
export function topicsForGrade(gradeKey) {
  const key = String(gradeKey).toLowerCase();

  // 1) If the source already exposes a function, just delegate to it.
  const fn =
    src.topicsForGrade ||
    src.getTopicsForGrade ||
    (typeof src.default === 'object' && src.default.topicsForGrade);

  if (typeof fn === 'function') {
    const arr = fn(key) || [];
    return arr.map(t => normalizeTopic(t, key));
  }

  // 2) Otherwise, try to read from a map-like export.
  const bag = src.CURRICULUM || src.curriculum || src.default;
  if (!bag || typeof bag !== 'object') {
    throw new Error(
      'curriculumdata.mjs must export either `topicsForGrade(gradeKey)` or a mapping like CURRICULUM/{gradeKey: Topic[]}.'
    );
  }

  // Support keys as provided (e.g., 'k', '1', ...) — be forgiving about case.
  const direct = bag[key];
  if (Array.isArray(direct)) {
    return direct.map(t => normalizeTopic(t, key));
  }

  // Also try normalized numeric keys as strings if needed.
  const altKey = String(key);
  const alt = bag[altKey];
  if (Array.isArray(alt)) {
    return alt.map(t => normalizeTopic(t, key));
  }

  // Nothing for this grade — return empty array instead of throwing.
  return [];
}

// Optional re-export of labels if you want them elsewhere
export { GRADE_LABELS };
