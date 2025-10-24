#!/usr/bin/env node
// v2 — adds parent_teaching_script (say/do/ask/reinforce)

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { promises as fs } from 'fs';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');
const LESSONS_DIR = path.join(ROOT, 'public', 'lessons');

const OPENAI_KEY = process.env.OPENAI_API_KEY || process.env.OPENAI_API_TOKEN;
if (!OPENAI_KEY) {
  console.error('❌ Missing OPENAI_API_KEY in .env.local (or environment).');
  process.exit(1);
}

const args = process.argv.slice(2);
const getArg = (name, def = null) => {
  const a = args.find(x => x.startsWith(`--${name}=`));
  return a ? a.split('=')[1] : def;
};

const gradeArg = getArg('grade', null);
const onlyArg = getArg('only', null);
const limit = parseInt(getArg('limit', '0'), 10) || 0;
const modelPrimary = getArg('model', 'gpt-4o-mini');
const retries = parseInt(getArg('retries', '1'), 10) || 1;
const temperature = parseFloat(getArg('temperature', '0.6')) || 0.6;

/* ------------ helpers: latex + matrices (same as before) ------------ */
const TOKENS = ['\\frac','\\sum','\\sqrt','\\int','\\prod','\\lim','\\bar','\\hat','\\vec','\\cdot','\\times','\\le','\\ge','\\sigma','\\mu','\\pi','\\infty'];
const needsWrap = s => typeof s === 'string' && !/\$(?:[^$]|\\\$)+\$/s.test(s) && !/\$\$[\s\S]+?\$\$/s.test(s) && TOKENS.some(t=>s.includes(t));
const wrapLatex = v => (needsWrap(v) ? `$$\n${v}\n$$` : v);
function wrapLatexDeep(v){ if(typeof v==='string') return wrapLatex(v); if(Array.isArray(v)) return v.map(wrapLatexDeep); if(v&&typeof v==='object'){ for(const k of Object.keys(v)) v[k]=wrapLatexDeep(v[k]); } return v; }
function convertMatrixTextToKatex(input) {
  if (typeof input !== 'string' || !input.includes('[[')) return input;
  const re = /\[\s*\[\s*[^[\]]+?\s*\](?:\s*,\s*\[\s*[^[\]]+?\s*\])+\s*\]/g;
  return input.replace(re, (m)=> {
    const inner = m.trim().replace(/^\[\s*/,'').replace(/\s*\]$/,'');
    const rows = inner.split(/\]\s*,\s*\[/g).map(r=>r.replace(/^\[\s*/,'').replace(/\s*\]$/,'').split(/\s*,\s*/g));
    if (rows.length<2) return m;
    const body = rows.map(c=>c.join(' & ')).join(' \\\\ ');
    return `$$\\begin{bmatrix} ${body} \\end{bmatrix}$$`;
  });
}
function fixMatricesDeep(v){ if(typeof v==='string') return convertMatrixTextToKatex(v); if(Array.isArray(v)) return v.map(fixMatricesDeep); if(v&&typeof v==='object'){ for(const k of Object.keys(v)) v[k]=fixMatricesDeep(v[k]); } return v; }

/* ------------ targets ------------ */
function wants(grade, slug) {
  if (onlyArg) {
    const m = onlyArg.match(/^grade=(k|\d{1,2}):(.+)$/i);
    if (m) return String(grade).toLowerCase()===m[1].toLowerCase() && slug===m[2];
    if (onlyArg.includes('/')) { const [g,s]=onlyArg.split('/'); return String(grade)===g && slug===s; }
    return false;
  }
  if (gradeArg) return String(grade).toLowerCase()===String(gradeArg).toLowerCase();
  return true;
}
async function listTargets(){
  const out=[];
  const grades=(await fs.readdir(LESSONS_DIR,{withFileTypes:true})).filter(d=>d.isDirectory()).map(d=>d.name);
  for(const g of grades){
    const dir=path.join(LESSONS_DIR,g);
    const files=(await fs.readdir(dir)).filter(f=>f.endsWith('.json') && !f.startsWith('_'));
    for(const f of files){ const slug=f.replace(/\.json$/,''); if(wants(g,slug)) out.push({grade:g,slug,file:path.join(dir,f)}); }
  }
  return out;
}

/* ------------ OpenAI ------------ */
async function callOpenAIJSON(prompt, model, tries) {
  let last=null;
  for(let i=0;i<tries;i++){
    try{
      const res=await fetch('https://api.openai.com/v1/chat/completions',{
        method:'POST',
        headers:{Authorization:`Bearer ${OPENAI_KEY}`,'Content-Type':'application/json'},
        body:JSON.stringify({
          model, temperature,
          response_format:{type:'json_object'},
          messages:[
            {role:'system', content:'You write concise, warm, parent-focused K–12 math lessons in JSON.'},
            {role:'user', content:prompt}
          ]
        })
      });
      if(!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
      const data=await res.json();
      return JSON.parse(data?.choices?.[0]?.message?.content ?? '{}');
    }catch(e){ last=e; }
  }
  throw last || new Error('OpenAI call failed');
}

/* ------------ prompt ------------ */
function makePrompt(title, gradeLabel){
  return `
Create a parent-focused lesson as JSON for "${title}" (Grade ${gradeLabel}).

Include these keys EXACTLY:

{
  "title": string,
  "introduction": string,
  "objective": string,
  "why_matters": string,
  "parent_tip": string,
  "real_world_link": string,

  "formula_box": {
    "formula": string,
    "symbols": [{"symbol": string, "meaning": string}],
    "how_it_works": string,
    "example": string
  } | null,

  "teaching_steps": [string, ...],

  "parent_teaching_script": [
    {"say": string, "do": string, "ask": string, "reinforce": string},
    ...
  ],

  "practice": [
    {"prompt": string, "hint": string, "answer": string},
    ...
  ],

  "recap": [string, ...],
  "common_mistakes": [string, ...],

  "deep_dive": {
    "history": string,
    "connections": string,
    "misconceptions": string,
    "teaching_tips": string,
    "derivation": string
  },

  "motivation": string
}

Rules:
- Friendly, parent-facing language.
- Use **Formula Box only if truly needed**; otherwise set it to null.
- In Formula Box, explain symbols clearly.
- **Parent Teaching Script** must be 5–8 steps using natural “Say / Show-Do / Ask / Reinforce”.
- Practice items must be numeric and include realistic **hint** and **answer**.
- Keep content scannable for mobile.`;
}

/* ------------ backfill & compose ------------ */
function looksMathy(s){ return !!(s && (/[=+\-*/^√∑∫≤≥<>×÷]/.test(s) || /\\(times|frac|sqrt|sum|int|cdot|le|ge|bar)/.test(s))); }
function ensurePractice(practice){
  const out=[];
  for(const it of (practice||[]).slice(0,6)){
    const p = (it?.prompt||'').toString().trim();
    const h = (it?.hint||'Underline key words; try a smaller example first.').toString();
    const a = (it?.answer||'Compute step-by-step; check units.').toString();
    out.push({prompt:p, hint:h, answer:a});
  }
  while(out.length<4){
    out.push({
      prompt:'Try with 7 and 12 in a home example (snacks/steps).',
      hint:'Translate the story to a number sentence.',
      answer:'Compute with 7 and 12; explain each step.'
    });
  }
  return out;
}
function backfill(u,title){
  const co=(v,d)=> (v===undefined||v===null||(typeof v==='string' && !v.trim())) ? d : v;
  u.title = co(u.title, title);
  u.introduction = co(u.introduction, `This lesson helps you introduce **${title}** with simple home examples.`);
  u.objective = co(u.objective, `Your child can understand and practice **${title}** with concrete steps.`);
  u.why_matters = co(u.why_matters, `Builds confidence and prepares for related topics later.`);
  u.parent_tip = co(u.parent_tip, `Keep sessions short; praise effort and thinking.`);
  u.real_world_link = co(u.real_world_link, `Point out moments at home where **${title}** appears.`);
  if (u.formula_box && !looksMathy(u.formula_box.formula)) u.formula_box = null;
  if (u.formula_box && !Array.isArray(u.formula_box.symbols)) u.formula_box.symbols = [];

  // Ensure Parent Teaching Script exists
  if (!Array.isArray(u.parent_teaching_script) || !u.parent_teaching_script.length) {
    u.parent_teaching_script = [
      { say:`Let’s look at **${title}** together.`, do:'Show a tiny example on paper.', ask:'What do you notice first?', reinforce:'Great observation—keep noticing patterns.' },
      { say:'Here’s the first step.', do:'Demonstrate with small numbers.', ask:'Which number should we use next?', reinforce:'Nice choice—say why you picked it.' },
      { say:'Now we combine the ideas.', do:'Connect step 1 to step 2.', ask:'How do these pieces fit?', reinforce:'Exactly; steps build on each other.' },
      { say:'Let’s check.', do:'Estimate before exact.', ask:'Does the answer feel reasonable?', reinforce:'Estimating first builds confidence.' }
    ];
  }

  u.teaching_steps = Array.isArray(u.teaching_steps) && u.teaching_steps.length ? u.teaching_steps : [
    'Start with a tiny concrete example (use objects or small numbers).',
    'Name the key idea in friendly words.',
    'Walk through one full example out loud.',
    'Ask the child to try a similar example with guidance.'
  ];

  u.practice = ensurePractice(u.practice);

  u.recap = Array.isArray(u.recap) && u.recap.length ? u.recap : [
    `We practiced **${title}** with real numbers.`,
    'We explained our steps out loud.',
    'We checked answers with an estimate first.'
  ];
  u.common_mistakes = Array.isArray(u.common_mistakes) && u.common_mistakes.length ? u.common_mistakes : [
    'Choosing an operation too early.',
    'Dropping units or misreading place value.'
  ];
  u.deep_dive = u.deep_dive || {};
  u.deep_dive.history = co(u.deep_dive.history, `A brief background for parents on **${title}**.`);
  u.deep_dive.connections = co(u.deep_dive.connections, `Where **${title}** appears in later grades.`);
  u.deep_dive.misconceptions = co(u.deep_dive.misconceptions, `Common misunderstandings and gentle fixes.`);
  u.deep_dive.teaching_tips = co(u.deep_dive.teaching_tips, `Use small numbers first, keep steps verbal, insist on units.`);
  u.deep_dive.derivation = co(u.deep_dive.derivation, `If relevant, a short reasoning or derivation with simple numbers.`);
  u.motivation = co(u.motivation, `Celebrate small wins—confidence compounds.`);

  return u;
}

function mergeIntoLesson(existing, u){
  const lines = [];
  // (We don’t duplicate the big H1 — the page adds it)
  // Introduction
  if (u.introduction) {
    lines.push('## Lesson Introduction'); lines.push(u.introduction); lines.push('');
  }
  // Orientation
  lines.push('## Parent Orientation');
  lines.push(`**Objective:** ${u.objective}`);
  lines.push(`**Why it matters:** ${u.why_matters}`);
  lines.push(`**Parent Tip:** ${u.parent_tip}`);
  lines.push(`**Real-World Link:** ${u.real_world_link}`);

  // Formula Box
  if (u.formula_box && u.formula_box.formula) {
    lines.push('');
    lines.push('> **📐 Formula Box**');
    lines.push(`> **Formula:** ${u.formula_box.formula}`);
    if (Array.isArray(u.formula_box.symbols) && u.formula_box.symbols.length) {
      lines.push('> **Symbols:**');
      for (const s of u.formula_box.symbols) lines.push(`> - **${s.symbol}** — ${s.meaning}`);
    }
    if (u.formula_box.how_it_works) lines.push(`> **How it works:** ${u.formula_box.how_it_works}`);
    if (u.formula_box.example) lines.push(`> **Example:** ${u.formula_box.example}`);
  }

  // Teaching Steps
  lines.push('');
  lines.push('## Teaching Steps');
  u.teaching_steps.forEach((s,i)=>lines.push(`${i+1}. ${s}`));

  // NEW — Parent Teaching Script
  if (Array.isArray(u.parent_teaching_script) && u.parent_teaching_script.length){
    lines.push('');
    lines.push('## 👨‍👩‍👧 Parent Teaching Script (Step-by-Step Conversation)');
    u.parent_teaching_script.forEach((st,i)=>{
      const chunks=[];
      if(st.say) chunks.push(`**Say:** ${st.say}`);
      if(st.do) chunks.push(`**Show/Do:** ${st.do}`);
      if(st.ask) chunks.push(`**Ask:** ${st.ask}`);
      if(st.reinforce) chunks.push(`**Reinforce:** ${st.reinforce}`);
      lines.push(`${i+1}. ${chunks.join('  \n')}`);
    });
  }

  // Practice
  lines.push('');
  lines.push('## Practice Questions (Do It Together)');
  u.practice.forEach((q,i)=>{
    lines.push(`**${i+1}. ${q.prompt}**`);
    lines.push(`<details><summary>Hint</summary>\n${q.hint}\n</details>`);
    lines.push(`<details><summary>Answer</summary>\n${q.answer}\n</details>`);
    lines.push('');
  });

  // Recap & Mistakes
  lines.push('');
  lines.push('## Recap & Common Mistakes');
  lines.push('**Key Takeaways**');
  u.recap.forEach(t=>lines.push(`- ${t}`));
  lines.push('\n**Common Mistakes**');
  u.common_mistakes.forEach(m=>lines.push(`- ${m}`));

  // Deep Dive
  lines.push('');
  lines.push('## 🔍 Deep Dive');
  lines.push(`**History or origin**\n\n${u.deep_dive.history}`);
  lines.push(`\n**Future topic connections**\n\n${u.deep_dive.connections}`);
  lines.push(`\n**Common misconceptions**\n\n${u.deep_dive.misconceptions}`);
  lines.push(`\n**Teaching tips for parents**\n\n${u.deep_dive.teaching_tips}`);
  lines.push(`\n**More detail / derivation**\n\n${u.deep_dive.derivation}`);

  // Motivation
  lines.push('');
  lines.push('## Motivation');
  lines.push(u.motivation);

  const merged = { ...existing };
  merged.universal = u;
  merged.markdown = lines.join('\n');

  // keep brief legacy mirrors if you want
  return merged;
}

/* ------------ main ------------ */
async function main(){
  const targets = await listTargets();
  if (!targets.length){ console.log('No matching lessons.'); return; }
  let authored=0, processed=0, skipped=0;

  for(const t of targets){
    if (limit && authored>=limit) break;
    try{
      const raw=await fs.readFile(t.file,'utf8');
      const data=JSON.parse(raw);
      const gradeLabel = data?.grade?.slug ?? data?.grade?.name ?? t.grade;
      const title = data?.lesson?.title ?? (data?.lesson?.slug ? data.lesson.slug.replace(/-/g,' ') : t.slug.replace(/-/g,' '));
      const prompt = makePrompt(title, gradeLabel);

      let u = await callOpenAIJSON(prompt, modelPrimary, retries);
      u = backfill(u, title);
      u = wrapLatexDeep(u);
      u = fixMatricesDeep(u);
      if (u.formula_box && !looksMathy(u.formula_box.formula)) u.formula_box = null;

      const merged = mergeIntoLesson(data, u);
      await fs.writeFile(t.file, JSON.stringify(merged,null,2),'utf8');
      console.log(`✍️  Authored (Universal+Script): ${t.grade}/${t.slug}`);
      authored++;
    }catch(e){
      console.log(`❌ ${t.grade}/${t.slug}: ${e.message}`);
      skipped++;
    }
    processed++;
  }
  console.log(`\nProcessed: ${processed}, Authored: ${authored}, Skipped: ${skipped}`);
}
main().catch(err=>{ console.error(err); process.exit(1); });
