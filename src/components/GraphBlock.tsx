// src/components/GraphBlock.tsx
"use client";

import React from "react";

/** ---------- Spec Types ---------- */
export type CartesianSpec = {
  type: "cartesian";
  width?: number;          // px (default 640)
  height?: number;         // px (default 360)
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  grid?: boolean;          // default true
  ticks?: number;          // default 10
  axis?: boolean;          // default true
  lines?: Array<{ m: number; b: number; color?: string; strokeWidth?: number }>;
  points?: Array<{ x: number; y: number; label?: string; color?: string }>;
  functions?: Array<{
    expr: string;          // e.g. "sin(x) + 0.3*x"
    samples?: number;      // default 200
    color?: string;
    strokeWidth?: number;
  }>;
};

export type GraphSpec = CartesianSpec; // (room for future types)

/** ---------- Parser (exported for Markdown hook) ---------- */
export function parseGraphSpec(raw: string): GraphSpec | null {
  try {
    const spec = JSON.parse(raw) as GraphSpec;
    if (!spec || typeof spec !== "object") return null;
    if (spec.type !== "cartesian") return null;
    // basic validation
    if (
      typeof (spec as CartesianSpec).xMin !== "number" ||
      typeof (spec as CartesianSpec).xMax !== "number" ||
      typeof (spec as CartesianSpec).yMin !== "number" ||
      typeof (spec as CartesianSpec).yMax !== "number"
    ) {
      return null;
    }
    return spec;
  } catch {
    return null;
  }
}

/** ---------- Helpers ---------- */
function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function makeSafeEval() {
  // Minimal sandbox that only exposes Math + x
  const allowed = Object.getOwnPropertyNames(Math).reduce(
    (acc, k) => ({ ...acc, [k]: (Math as any)[k] }),
    {} as Record<string, any>
  );
  return (expr: string, x: number) => {
    // forbid suspicious tokens
    if (/[;{}[\]]|new\s+Function|=>|process|window|global|import|eval/.test(expr))
      throw new Error("Unsafe expression");
    // build a scoped function
    const fn = new Function(
      "x",
      ...Object.keys(allowed),
      `return (${expr});`
    ) as (...args: any[]) => number;
    return fn(x, ...Object.values(allowed));
  };
}

/** ---------- Renderers ---------- */
function Cartesian({ spec }: { spec: CartesianSpec }) {
  const width = spec.width ?? 640;
  const height = spec.height ?? 360;
  const grid = spec.grid ?? true;
  const ticks = spec.ticks ?? 10;
  const showAxis = spec.axis ?? true;

  const { xMin, xMax, yMin, yMax } = spec;

  const xToPx = (x: number) =>
    ((x - xMin) / (xMax - xMin)) * width;
  const yToPx = (y: number) =>
    height - ((y - yMin) / (yMax - yMin)) * height;

  const tickVals = Array.from({ length: ticks + 1 }, (_, i) => i / ticks);

  // Build function polylines
  const functionPaths: Array<{ d: string; color: string; strokeWidth: number }> = [];
  if (spec.functions?.length) {
    const safeEval = makeSafeEval();
    for (const f of spec.functions) {
      const samples = clamp(f.samples ?? 200, 32, 2000);
      const step = (xMax - xMin) / (samples - 1);
      let d = "";
      for (let i = 0; i < samples; i++) {
        const x = xMin + i * step;
        let y: number;
        try {
          y = safeEval(f.expr, x);
        } catch {
          continue;
        }
        const px = xToPx(x);
        const py = yToPx(y);
        d += (i === 0 ? "M" : "L") + px + " " + py + " ";
      }
      functionPaths.push({
        d,
        color: f.color ?? "#16a34a", // green-600
        strokeWidth: f.strokeWidth ?? 2,
      });
    }
  }

  // Line segments for y = m x + b: clip to viewport
  function lineToSegment(m: number, b: number) {
    // compute intersections with each boundary; keep points inside bbox
    const xs = [xMin, xMax];
    const ys = xs.map((x) => m * x + b);

    // also consider intersections with horizontal bounds at yMin/yMax
    const xAtYmin = (yMin - b) / m;
    const xAtYmax = (yMax - b) / m;

    const candidates: Array<{ x: number; y: number }> = [];
    // vertical bounds
    candidates.push({ x: xs[0], y: ys[0] });
    candidates.push({ x: xs[1], y: ys[1] });
    if (Number.isFinite(xAtYmin)) candidates.push({ x: xAtYmin, y: yMin });
    if (Number.isFinite(xAtYmax)) candidates.push({ x: xAtYmax, y: yMax });

    // keep only points inside bbox (with a little margin)
    const inside = candidates.filter(
      (p) => p.x >= xMin - 1e-6 && p.x <= xMax + 1e-6 && p.y >= yMin - 1e-6 && p.y <= yMax + 1e-6
    );

    if (inside.length < 2) return null;
    // pick two farthest points for segment
    let a = inside[0], bpt = inside[1], maxd = -1;
    for (let i = 0; i < inside.length; i++) {
      for (let j = i + 1; j < inside.length; j++) {
        const d = (inside[i].x - inside[j].x) ** 2 + (inside[i].y - inside[j].y) ** 2;
        if (d > maxd) {
          maxd = d;
          a = inside[i];
          bpt = inside[j];
        }
      }
    }
    return `M ${xToPx(a.x)} ${yToPx(a.y)} L ${xToPx(bpt.x)} ${yToPx(bpt.y)}`;
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Graph"
      className="rounded-xl border border-gray-200 bg-white my-2"
    >
      {/* grid */}
      {grid && (
        <g stroke="#e5e7eb" strokeWidth={1}>
          {tickVals.map((t, i) => {
            const x = Math.round(xToPx(xMin + t * (xMax - xMin))) + 0.5;
            return <line key={"gx"+i} x1={x} y1={0} x2={x} y2={height} />;
          })}
          {tickVals.map((t, i) => {
            const y = Math.round(yToPx(yMin + t * (yMax - yMin))) + 0.5;
            return <line key={"gy"+i} x1={0} y1={y} x2={width} y2={y} />;
          })}
        </g>
      )}

      {/* axes */}
      {showAxis && (
        <g stroke="#111827" strokeWidth={1.5}>
          {/* y=0 */}
          {yMin < 0 && yMax > 0 && (
            <line x1={0} y1={yToPx(0)} x2={width} y2={yToPx(0)} />
          )}
          {/* x=0 */}
          {xMin < 0 && xMax > 0 && (
            <line x1={xToPx(0)} y1={0} x2={xToPx(0)} y2={height} />
          )}
        </g>
      )}

      {/* functions */}
      {functionPaths.map((p, i) => (
        <path key={"f"+i} d={p.d} fill="none" stroke={p.color} strokeWidth={p.strokeWidth} />
      ))}

      {/* y=mx+b lines */}
      {spec.lines?.map((ln, i) => {
        const d = lineToSegment(ln.m, ln.b);
        if (!d) return null;
        return (
          <path
            key={"l"+i}
            d={d}
            fill="none"
            stroke={ln.color ?? "#2563eb"} // blue-600
            strokeWidth={ln.strokeWidth ?? 2}
          />
        );
      })}

      {/* points */}
      {spec.points?.map((p, i) => {
        const cx = xToPx(p.x);
        const cy = yToPx(p.y);
        return (
          <g key={"p"+i}>
            <circle cx={cx} cy={cy} r={3.5} fill={p.color ?? "#dc2626"} />
            {p.label && (
              <text x={cx + 6} y={cy - 6} fontSize={12} fill="#111827">
                {p.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/** Default export picks renderer by spec.type (only cartesian for now) */
export default function GraphBlock({ spec }: { spec: GraphSpec }) {
  if (spec.type === "cartesian") {
    return <Cartesian spec={spec} />;
  }
  return null;
}
