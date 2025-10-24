#!/usr/bin/env node
/**
 * Convert inline JS-style matrices like [[2, 0], [1, 3]]
 * into KaTeX display math:
 *   $$\begin{bmatrix} 2 & 0 \\ 1 & 3 \end{bmatrix}$$
 *
 * Applies to:
 * - json.markdown
 * - json.sectionsArray[*].md
 * - json.sections[*]
 * - json.universal subtree (all strings)
 * - then a final pass over the whole JSON object for any missed strings
 *
 * Run:
 *   npm run lessons:fix:matrices
 */

import fs from "fs";
import path from "path";

const ROOT = path.join(process.cwd(), "public", "lessons");

function isDir(p) {
  try { return fs.statSync(p).isDirectory(); } catch { return false; }
}

function convertMatrixTextToKatex(input) {
  if (typeof input !== "string" || !input.includes("[[")) return input;

  // Match [[row],[row],...] where each row has no nested [] inside (simple cells).
  const matrixRegex = /\[\s*\[\s*[^[\]]+?\s*\](?:\s*,\s*\[\s*[^[\]]+?\s*\])+\s*\]/g;

  return input.replace(matrixRegex, (match) => {
    const inner = match.trim().replace(/^\[\s*/, "").replace(/\s*\]$/, "");
    const rows = inner.split(/\]\s*,\s*\[/g).map(r => {
      const clean = r.replace(/^\[\s*/, "").replace(/\s*\]$/, "");
      const cells = clean.split(/\s*,\s*/g).map(x => x.trim());
      return cells;
    });

    if (!rows.length || rows.length < 2) return match;

    const katex = rows.map(cells => cells.join(" & ")).join(" \\\\ ");
    return `$$\\begin{bmatrix} ${katex} \\end{bmatrix}$$`;
  });
}

function walkStringsDeep(value) {
  if (typeof value === "string") return convertMatrixTextToKatex(value);
  if (Array.isArray(value)) return value.map(walkStringsDeep);
  if (value && typeof value === "object") {
    for (const k of Object.keys(value)) {
      value[k] = walkStringsDeep(value[k]);
    }
    return value;
  }
  return value;
}

function fixFile(fp) {
  try {
    const raw = fs.readFileSync(fp, "utf8");
    const json = JSON.parse(raw);
    const before = JSON.stringify(json);

    // Known markdown holders
    if (typeof json.markdown === "string") {
      json.markdown = convertMatrixTextToKatex(json.markdown);
    }

    if (Array.isArray(json.sectionsArray)) {
      json.sectionsArray = json.sectionsArray.map(s => (
        typeof s?.md === "string" ? { ...s, md: convertMatrixTextToKatex(s.md) } : s
      ));
    }

    if (json.sections && typeof json.sections === "object") {
      for (const key of Object.keys(json.sections)) {
        if (typeof json.sections[key] === "string") {
          json.sections[key] = convertMatrixTextToKatex(json.sections[key]);
        }
      }
    }

    if (json.universal && typeof json.universal === "object") {
      json.universal = walkStringsDeep(json.universal);
    }

    // Final global pass
    const transformed = walkStringsDeep(json);

    const after = JSON.stringify(transformed);
    if (before !== after) {
      fs.writeFileSync(fp, JSON.stringify(transformed, null, 2), "utf8");
      console.log(`✅ Fixed matrices in: ${fp}`);
    }
  } catch (e) {
    console.error(`⚠️  Error fixing ${fp}: ${e.message}`);
  }
}

function main() {
  if (!isDir(ROOT)) {
    console.error("❌ public/lessons directory not found.");
    process.exit(1);
  }
  const grades = fs.readdirSync(ROOT).filter(g => isDir(path.join(ROOT, g)));
  for (const g of grades) {
    const dir = path.join(ROOT, g);
    const files = fs.readdirSync(dir).filter(f => f.endsWith(".json"));
    for (const f of files) {
      fixFile(path.join(dir, f));
    }
  }
  console.log("✨ Matrix formatting pass complete.");
}

main();
