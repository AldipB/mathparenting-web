// src/types/curriculum.ts

// A single rendered lesson JSON (what your frontend expects)
export interface Lesson {
  title: string;
  grade: number;
  summary?: string;
  objectives?: string[];
  parentOverview?: string;
  householdDemo?: string;
  mathBehindIt?: string;
  steps?: string[];
  practice?: string[];
  curiosity?: string[];
  positiveClose?: string;
  // extend as needed
}

// Metadata used for listing lessons/units
export interface LessonMeta {
  slug: string;      // e.g. "integer-operations"
  title: string;
  grade: number;
  unitId?: string;
}

export interface Unit {
  id: string;        // e.g. "operations"
  title: string;     // e.g. "Integer Operations"
  lessons: LessonMeta[];
}

// Group units by grade code: "k" | "1" | ... | "12"
export interface CurriculumByGrade {
  [grade: string]: Unit[];
}
