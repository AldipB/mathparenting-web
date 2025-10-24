import fs from 'node:fs';
import path from 'node:path';
import { notFound } from 'next/navigation';
import LessonContentClient from '@/components/LessonContentClient';
import 'katex/dist/katex.min.css';

export const revalidate = 60;

type AnyRec = Record<string, any>;

type ParentScriptStep = {
  say?: string;
  do?: string;
  ask?: string;
  reinforce?: string;
};

function readLesson(grade: string, lesson: string): AnyRec | null {
  const filePath = path.join(
    process.cwd(),
    'public',
    'lessons',
    grade.toLowerCase(),
    `${lesson}.json`,
  );
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as AnyRec;
  } catch {
    return null;
  }
}

function titleFromSlug(slug: string) {
  return slug
    .split('-')
    .map((s) => (s ? s[0].toUpperCase() + s.slice(1) : s))
    .join(' ');
}

/** Build parent-friendly markdown WITHOUT repeating the big H1 title. */
function composePrimaryMarkdown(data: AnyRec) {
  const u = data.universal ?? null;

  if (u) {
    const lines: string[] = [];

    // — Lesson Introduction
    if (u.introduction) {
      lines.push(`## Lesson Introduction`);
      lines.push(u.introduction);
      lines.push('');
    }

    // — Parent Orientation
    lines.push(`## Parent Orientation`);
    lines.push(`**Objective:** ${u.objective ?? ''}`);
    lines.push(`**Why it matters:** ${u.why_matters ?? ''}`);
    lines.push(`**Parent Tip:** ${u.parent_tip ?? ''}`);
    lines.push(`**Real-World Link:** ${u.real_world_link ?? ''}`);

    // — Formula Box (if present)
    const fb = u.formula_box;
    if (fb?.formula && (/\d|[a-zA-Z]|\\/.test(fb.formula))) {
      lines.push('');
      lines.push(`> **📐 Formula Box**`);
      lines.push(`> **Formula:** ${fb.formula}`);
      if (Array.isArray(fb.symbols) && fb.symbols.length) {
        lines.push(`> **Symbols:**`);
        for (const s of fb.symbols) lines.push(`> - **${s.symbol}** — ${s.meaning}`);
      } else if (fb?.meaning) {
        lines.push(`> **Meaning:** ${fb.meaning}`);
      }
      if (fb?.how_it_works) lines.push(`> **How it works:** ${fb.how_it_works}`);
      if (fb?.example) lines.push(`> **Example:** ${fb.example}`);
    }

    // — Teaching Steps
    const steps: string[] = Array.isArray(u.teaching_steps) ? u.teaching_steps : [];
    if (steps.length) {
      lines.push('');
      lines.push(`## Teaching Steps`);
      steps.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
    }

    // — NEW: Parent Teaching Script
    const ptsRaw = Array.isArray(u.parent_teaching_script) ? u.parent_teaching_script : [];
    const pts: ParentScriptStep[] = ptsRaw as ParentScriptStep[];
    if (pts.length) {
      lines.push('');
      lines.push(`## 👨‍👩‍👧 Parent Teaching Script (Step-by-Step Conversation)`);
      pts.forEach((step: ParentScriptStep, i: number) => {
        const parts: string[] = [];
        if (step.say) parts.push(`**Say:** ${step.say}`);
        if (step.do) parts.push(`**Show/Do:** ${step.do}`);
        if (step.ask) parts.push(`**Ask:** ${step.ask}`);
        if (step.reinforce) parts.push(`**Reinforce:** ${step.reinforce}`);
        lines.push(`${i + 1}. ${parts.join('  \n')}`);
      });
    }

    // — Practice
    const practice = u.practice ?? u.active_practice ?? [];
    if (Array.isArray(practice) && practice.length) {
      lines.push('');
      lines.push(`## Practice Questions (Do It Together)`);
      practice.forEach((q: any, i: number) => {
        lines.push(`**${i + 1}. ${q.prompt}**`);
        if (q.hint || q.coaching_hint)
          lines.push(
            `<details><summary>Hint</summary>\n${q.hint ?? q.coaching_hint}\n</details>`,
          );
        if (q.answer || q.solution)
          lines.push(
            `<details><summary>Answer</summary>\n${q.answer ?? q.solution}\n</details>`,
          );
        lines.push('');
      });
    }

    // — Recap & Common Mistakes
    lines.push('');
    lines.push(`## Recap & Common Mistakes`);
    const takeaways = u.recap ?? u.recap_parent_reflection?.key_takeaways ?? [];
    if (Array.isArray(takeaways) && takeaways.length) {
      lines.push(`**Key Takeaways**`);
      takeaways.forEach((t: string) => lines.push(`- ${t}`));
    }
    const mistakes = u.common_mistakes ?? u.recap_parent_reflection?.common_mistakes ?? [];
    if (Array.isArray(mistakes) && mistakes.length) {
      lines.push(`\n**Common Mistakes**`);
      mistakes.forEach((m: string) => lines.push(`- ${m}`));
    }

    // — Deep Dive
    const dd = u.deep_dive ?? {};
    if (dd.history || dd.connections || dd.misconceptions || dd.teaching_tips || dd.derivation) {
      lines.push('');
      lines.push(`## 🔍 Deep Dive`);
      if (dd.history) lines.push(`**History or origin**\n\n${dd.history}`);
      if (dd.connections) lines.push(`\n**Future topic connections**\n\n${dd.connections}`);
      if (dd.misconceptions) lines.push(`\n**Common misconceptions**\n\n${dd.misconceptions}`);
      if (dd.teaching_tips) lines.push(`\n**Teaching tips for parents**\n\n${dd.teaching_tips}`);
      if (dd.derivation) lines.push(`\n**More detail / derivation**\n\n${dd.derivation}`);
    }

    // — Motivation
    if (u.motivation) {
      lines.push('');
      lines.push(`## Motivation`);
      lines.push(u.motivation);
    }

    return lines.join('\n');
  }

  if (typeof data.markdown === 'string' && data.markdown.trim()) {
    // Fallback for old lessons
    return data.markdown;
  }

  return 'This lesson needs migration. Please regenerate it.';
}

export default async function Page(props: {
  params: Promise<{ grade: string; lesson: string }>;
}) {
  const { grade, lesson } = await props.params;
  const data = readLesson(grade, lesson);
  if (!data) notFound();

  const title =
    (data.universal?.title ?? data.lesson?.title ?? titleFromSlug(lesson)) || '';

  const md = composePrimaryMarkdown(data);

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      {/* Heading area */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <div className="mt-2 flex items-center gap-3 text-sm text-gray-500">
          <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2 py-0.5">
            {grade.toLowerCase() === 'k' ? 'Kindergarten' : `Grade ${grade}`}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5">
            {lesson}.json
          </span>
        </div>
      </div>

      <LessonContentClient md={md} />
    </main>
  );
}
