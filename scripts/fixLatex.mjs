#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const ROOT = path.join(process.cwd(), 'public', 'lessons');

const TOKENS = ['\\frac','\\sum','\\sqrt','\\bar','\\hat','\\cdot','\\times','\\le','\\ge','\\infty','\\sigma','\\mu','\\pi'];

function needsWrap(s){
  if (typeof s !== 'string') return false;
  if (/\$(?:[^$]|\\\$)+\$/s.test(s) || /\$\$[\s\S]+?\$\$/s.test(s)) return false;
  return TOKENS.some(t=>s.includes(t));
}
function wrap(s){ return needsWrap(s) ? `$$\n${s}\n$$` : s; }

function deep(v){
  if (typeof v === 'string') return wrap(v);
  if (Array.isArray(v)) return v.map(deep);
  if (v && typeof v === 'object'){ for (const k of Object.keys(v)) v[k]=deep(v[k]); }
  return v;
}

for (const g of fs.readdirSync(ROOT)) {
  const dir = path.join(ROOT,g);
  if (!fs.statSync(dir).isDirectory()) continue;
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.json')) continue;
    const fp = path.join(dir,f);
    const json = JSON.parse(fs.readFileSync(fp,'utf8'));
    const before = JSON.stringify(json);
    const afterObj = deep(json);
    const after = JSON.stringify(afterObj);
    if (before !== after) {
      fs.writeFileSync(fp, JSON.stringify(afterObj,null,2));
      console.log('✅ Wrapped LaTeX:', fp);
    }
  }
}
console.log('✨ LaTeX wrap pass complete.');
