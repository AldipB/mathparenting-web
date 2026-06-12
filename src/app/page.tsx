// src/app/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";

/* ------------------------------------------------------------------ */
/* Scroll reveal hook                                                  */
/* ------------------------------------------------------------------ */

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("revealed");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

/* ------------------------------------------------------------------ */
/* Kitchen Table Game                                                  */
/* ------------------------------------------------------------------ */

type GameMode = "count" | "pizza";

const COUNT_ITEMS = ["🍎", "🍪", "🪙", "⭐", "🍓", "⚽"];

function randInt(lo: number, hi: number) {
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

function makeCountRound() {
  const emoji = COUNT_ITEMS[randInt(0, COUNT_ITEMS.length - 1)];
  const count = randInt(3, 9);
  const options = new Set<number>([count]);
  while (options.size < 4) {
    const n = count + randInt(-2, 2);
    if (n >= 1) options.add(n);
  }
  return { emoji, count, options: [...options].sort((a, b) => a - b) };
}

function makePizzaRound() {
  const slices = [4, 6, 8][randInt(0, 2)];
  const target = randInt(1, slices - 1);
  return { slices, target };
}

const COUNT_COACH = [
  "Point to each one as your child says the number out loud. Touching while counting is how counting sticks.",
  "Ask: \u201Chow do you know you didn\u2019t count one twice?\u201D Let them invent a system, like moving left to right.",
  "If they rush and miss one, don\u2019t correct. Just ask \u201Cwant to double check together?\u201D and count along slowly.",
];

const PIZZA_COACH = [
  "Ask: \u201Cif the whole pizza is cut into this many slices, what does the bottom number mean?\u201D Let them connect it themselves.",
  "Tap a wrong slice on purpose and ask \u201Cdid that change how many we have?\u201D Mistakes you make are safe to laugh at.",
  "Ask: \u201Cwhat fraction is left unshaded?\u201D That one question quietly teaches that the parts always add up to the whole.",
];

function KitchenTableGame() {
  const [mode, setMode] = useState<GameMode>("pizza");
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<"idle" | "right" | "wrong">("idle");

  const [countRound, setCountRound] = useState(makeCountRound);
  const [pizzaRound, setPizzaRound] = useState(makePizzaRound);
  const [shaded, setShaded] = useState<Set<number>>(new Set());

  const coach =
    mode === "count"
      ? COUNT_COACH[round % COUNT_COACH.length]
      : PIZZA_COACH[round % PIZZA_COACH.length];

  function nextRound() {
    setFeedback("idle");
    setRound((r) => r + 1);
    if (mode === "count") setCountRound(makeCountRound());
    else {
      setPizzaRound(makePizzaRound());
      setShaded(new Set());
    }
  }

  function switchMode(m: GameMode) {
    setMode(m);
    setFeedback("idle");
    setRound(0);
    setScore(0);
    setCountRound(makeCountRound());
    setPizzaRound(makePizzaRound());
    setShaded(new Set());
  }

  function answerCount(n: number) {
    if (feedback === "right") return;
    if (n === countRound.count) {
      setScore((s) => s + 1);
      setFeedback("right");
    } else {
      setFeedback("wrong");
    }
  }

  function toggleSlice(i: number) {
    if (feedback === "right") return;
    setFeedback("idle");
    setShaded((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  function checkPizza() {
    if (shaded.size === pizzaRound.target) {
      setScore((s) => s + 1);
      setFeedback("right");
    } else {
      setFeedback("wrong");
    }
  }

  /* pizza geometry */
  const W = 260;
  const cx = W / 2;
  const cy = W / 2;
  const r = 110;
  const sliceAngle = (Math.PI * 2) / pizzaRound.slices;
  const wedgePath = (i: number) => {
    const a0 = i * sliceAngle - Math.PI / 2;
    const a1 = (i + 1) * sliceAngle - Math.PI / 2;
    const x0 = cx + r * Math.cos(a0);
    const y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy + r * Math.sin(a1);
    return `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1} Z`;
  };

  return (
    <div className="game-shell">
      {/* mode toggle */}
      <div className="game-tabs" role="tablist" aria-label="Choose a game">
        <button
          role="tab"
          aria-selected={mode === "pizza"}
          className={`game-tab ${mode === "pizza" ? "game-tab-on" : ""}`}
          onClick={() => switchMode("pizza")}
        >
          🍕 Pizza fractions <span className="game-tab-age">ages 7+</span>
        </button>
        <button
          role="tab"
          aria-selected={mode === "count"}
          className={`game-tab ${mode === "count" ? "game-tab-on" : ""}`}
          onClick={() => switchMode("count")}
        >
          🍎 Count together <span className="game-tab-age">ages 3 to 6</span>
        </button>
      </div>

      <div className="game-board">
        {/* left: the playable part */}
        <div className="game-play">
          {mode === "count" ? (
            <>
              <div className="game-question">How many do you see?</div>
              <div className="game-emojis" aria-label={`${countRound.count} items to count`}>
                {Array.from({ length: countRound.count }, (_, i) => (
                  <span key={`${round}-${i}`} className="game-emoji" style={{ animationDelay: `${i * 70}ms` }}>
                    {countRound.emoji}
                  </span>
                ))}
              </div>
              <div className="game-options">
                {countRound.options.map((n) => (
                  <button key={n} className="game-opt" onClick={() => answerCount(n)}>
                    {n}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="game-question">
                Tap slices to shade{" "}
                <span className="game-fraction">
                  <span>{pizzaRound.target}</span>
                  <span className="game-fraction-bar" />
                  <span>{pizzaRound.slices}</span>
                </span>{" "}
                of the pizza
              </div>
              <svg viewBox={`0 0 ${W} ${W}`} className="game-pizza" role="img" aria-label="Pizza divided into slices">
                <circle cx={cx} cy={cy} r={r + 8} fill="#F5DEB8" />
                <circle cx={cx} cy={cy} r={r} fill="#FBEFD8" stroke="#1C1008" strokeWidth={2} />
                {Array.from({ length: pizzaRound.slices }, (_, i) => (
                  <path
                    key={i}
                    d={wedgePath(i)}
                    fill={shaded.has(i) ? "#1A8A8A" : "transparent"}
                    stroke="#1C1008"
                    strokeWidth={1.5}
                    onClick={() => toggleSlice(i)}
                    style={{ cursor: "pointer", transition: "fill 0.18s" }}
                  />
                ))}
              </svg>
              <button className="game-check" onClick={checkPizza} disabled={feedback === "right"}>
                Check our pizza
              </button>
            </>
          )}

          {/* feedback */}
          <div className="game-feedback" aria-live="polite">
            {feedback === "right" && (
              <div className="game-right">
                <span className="game-burst">🎉</span> You got it together! Score: {score}
                <button className="game-next" onClick={nextRound}>Next one →</button>
              </div>
            )}
            {feedback === "wrong" && (
              <div className="game-wrong">
                Not yet, and that is fine. Try the coach tip →
              </div>
            )}
          </div>
        </div>

        {/* right: the parent coaching, this is the product's soul */}
        <div className="game-coach">
          <div className="game-coach-label">🧑‍🏫 While you play, try this</div>
          <p className="game-coach-text">{coach}</p>
          <div className="game-coach-foot">
            Every MathParenting answer comes with coaching like this, written for your child&rsquo;s exact homework question.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function HomePage() {
  useReveal();
  const year = useRef(new Date().getFullYear());

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=Nunito:wght@400;500;600;700;800&display=swap');

        :root {
          --cream: #FDFAF4;
          --teal: #1A8A8A;
          --teal-dark: #0D5F5F;
          --teal-light: #E0F4F4;
          --amber: #E8A838;
          --ink: #1C1008;
          --ink-soft: #4A3728;
          --ink-muted: #8C7B6B;
        }

        * { box-sizing: border-box; }

        .mp-page {
          background-color: var(--cream);
          font-family: 'Nunito', sans-serif;
          color: var(--ink);
          min-height: 100vh;
        }

        .display { font-family: 'Playfair Display', serif; }

        /* ---------- motion ---------- */
        .reveal { opacity: 0; transform: translateY(26px); }
        @media (prefers-reduced-motion: no-preference) {
          .reveal { transition: opacity 0.7s ease, transform 0.7s ease; }
          .revealed { opacity: 1; transform: translateY(0); }

          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(28px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes floatLogo {
            0%, 100% { transform: translateY(0px) rotate(-2deg); }
            50%      { transform: translateY(-10px) rotate(-2deg); }
          }
          @keyframes pulse-ring {
            0%   { transform: scale(1);   opacity: 0.5; }
            100% { transform: scale(1.7); opacity: 0; }
          }
          @keyframes popIn {
            0%   { opacity: 0; transform: scale(0.4); }
            70%  { transform: scale(1.15); }
            100% { opacity: 1; transform: scale(1); }
          }
          @keyframes burst {
            0%   { transform: scale(0.6) rotate(-12deg); }
            60%  { transform: scale(1.35) rotate(8deg); }
            100% { transform: scale(1) rotate(0deg); }
          }
          .anim-0 { animation: fadeUp 0.7s ease both; }
          .anim-1 { animation: fadeUp 0.7s 0.1s ease both; }
          .anim-2 { animation: fadeUp 0.7s 0.2s ease both; }
          .anim-3 { animation: fadeUp 0.7s 0.3s ease both; }
          .anim-4 { animation: fadeUp 0.7s 0.4s ease both; }
          .logo-float { animation: floatLogo 4s ease-in-out infinite; }
          .game-emoji { animation: popIn 0.4s ease both; }
          .game-burst { display: inline-block; animation: burst 0.5s ease both; }
        }
        @media (prefers-reduced-motion: reduce) {
          .reveal { opacity: 1; transform: none; }
        }

        .pulse-ring {
          position: absolute;
          inset: -14px;
          border-radius: 50%;
          border: 2px solid rgba(26,138,138,0.35);
        }
        @media (prefers-reduced-motion: no-preference) {
          .pulse-ring { animation: pulse-ring 2.5s ease-out infinite; }
          .pulse-ring-2 { animation-delay: 0.9s; }
        }

        /* ---------- buttons ---------- */
        .btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: var(--teal);
          color: white !important;
          font-family: 'Nunito', sans-serif;
          font-weight: 800;
          font-size: 1rem;
          padding: 14px 28px;
          border-radius: 100px;
          text-decoration: none !important;
          transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
          box-shadow: 0 4px 20px rgba(26,138,138,0.35);
          border: none;
          cursor: pointer;
        }
        .btn-primary:hover {
          background: var(--teal-dark);
          transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(26,138,138,0.45);
        }

        .btn-ghost {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: transparent;
          color: var(--teal-dark) !important;
          font-family: 'Nunito', sans-serif;
          font-weight: 800;
          font-size: 1rem;
          padding: 14px 28px;
          border-radius: 100px;
          text-decoration: none !important;
          border: 2px solid var(--teal);
          transition: background 0.2s, transform 0.15s;
          cursor: pointer;
        }
        .btn-ghost:hover {
          background: var(--teal-light);
          transform: translateY(-2px);
        }

        .ink-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(26,138,138,0.1);
          color: var(--teal-dark);
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 5px 14px;
          border-radius: 100px;
        }

        .hero-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(70px);
          pointer-events: none;
        }

        /* ---------- game ---------- */
        .game-shell {
          background: white;
          border-radius: 28px;
          border: 1px solid rgba(26,138,138,0.14);
          box-shadow: 0 12px 56px rgba(28,16,8,0.1);
          padding: 28px;
          max-width: 880px;
          margin: 0 auto;
        }
        .game-tabs {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 22px;
        }
        .game-tab {
          font-family: 'Nunito', sans-serif;
          font-weight: 800;
          font-size: 0.92rem;
          padding: 10px 18px;
          border-radius: 100px;
          border: 2px solid rgba(26,138,138,0.25);
          background: white;
          color: var(--teal-dark);
          cursor: pointer;
          transition: background 0.2s, border-color 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .game-tab:hover { background: var(--teal-light); }
        .game-tab-on {
          background: var(--teal);
          border-color: var(--teal);
          color: white;
        }
        .game-tab-age {
          font-size: 0.72rem;
          font-weight: 700;
          opacity: 0.75;
        }

        .game-board {
          display: grid;
          grid-template-columns: 1fr 280px;
          gap: 24px;
          align-items: start;
        }

        .game-play { text-align: center; }

        .game-question {
          font-family: 'Playfair Display', serif;
          font-weight: 700;
          font-size: 1.3rem;
          color: var(--ink);
          margin-bottom: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .game-fraction {
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          line-height: 1.05;
          font-family: 'Nunito', sans-serif;
          font-weight: 800;
          color: var(--teal-dark);
          font-size: 1.1rem;
          vertical-align: middle;
        }
        .game-fraction-bar {
          width: 22px;
          height: 2.5px;
          background: var(--teal-dark);
          border-radius: 2px;
          margin: 2px 0;
        }

        .game-emojis {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 12px;
          font-size: 2.4rem;
          min-height: 120px;
          align-items: center;
          margin-bottom: 18px;
          max-width: 360px;
          margin-left: auto;
          margin-right: auto;
        }

        .game-options {
          display: flex;
          gap: 10px;
          justify-content: center;
          flex-wrap: wrap;
        }
        .game-opt {
          width: 56px;
          height: 56px;
          border-radius: 16px;
          border: 2px solid rgba(26,138,138,0.3);
          background: white;
          font-family: 'Nunito', sans-serif;
          font-weight: 800;
          font-size: 1.3rem;
          color: var(--teal-dark);
          cursor: pointer;
          transition: background 0.15s, transform 0.12s;
        }
        .game-opt:hover { background: var(--teal-light); transform: translateY(-2px); }

        .game-pizza {
          width: 100%;
          max-width: 250px;
          height: auto;
          margin: 0 auto 16px;
          display: block;
        }
        .game-check {
          font-family: 'Nunito', sans-serif;
          font-weight: 800;
          font-size: 0.95rem;
          padding: 12px 26px;
          border-radius: 100px;
          border: none;
          background: var(--amber);
          color: var(--ink);
          cursor: pointer;
          box-shadow: 0 4px 16px rgba(232,168,56,0.4);
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .game-check:hover { transform: translateY(-2px); box-shadow: 0 6px 22px rgba(232,168,56,0.5); }
        .game-check:disabled { opacity: 0.5; cursor: default; transform: none; }

        .game-feedback { min-height: 56px; margin-top: 16px; }
        .game-right {
          color: var(--teal-dark);
          font-weight: 800;
          font-size: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .game-next {
          font-family: 'Nunito', sans-serif;
          font-weight: 800;
          font-size: 0.85rem;
          padding: 8px 18px;
          border-radius: 100px;
          border: none;
          background: var(--teal);
          color: white;
          cursor: pointer;
        }
        .game-next:hover { background: var(--teal-dark); }
        .game-wrong {
          color: var(--amber);
          font-weight: 800;
          font-size: 0.95rem;
        }

        .game-coach {
          background: var(--teal-light);
          border: 1px solid rgba(26,138,138,0.18);
          border-radius: 20px;
          padding: 22px;
        }
        .game-coach-label {
          font-weight: 800;
          font-size: 0.8rem;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--teal-dark);
          margin-bottom: 10px;
        }
        .game-coach-text {
          font-size: 0.95rem;
          color: var(--ink-soft);
          line-height: 1.75;
          margin: 0 0 14px;
          font-family: 'Nunito', sans-serif;
        }
        .game-coach-foot {
          font-size: 0.8rem;
          color: var(--teal-dark);
          font-weight: 700;
          line-height: 1.6;
          border-top: 1px solid rgba(26,138,138,0.2);
          padding-top: 12px;
        }

        /* ---------- cards ---------- */
        .moment-card {
          background: white;
          border-radius: 28px;
          border: 1px solid rgba(26,138,138,0.12);
          box-shadow: 0 8px 48px rgba(28,16,8,0.08), 0 2px 8px rgba(28,16,8,0.04);
          padding: 48px;
          max-width: 780px;
          margin: 0 auto;
        }

        .step-card {
          flex: 1;
          background: white;
          border-radius: 20px;
          padding: 28px;
          border: 1px solid rgba(26,138,138,0.1);
          box-shadow: 0 2px 16px rgba(28,16,8,0.05);
        }

        .get-card {
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.14);
          border-radius: 20px;
          padding: 24px;
          transition: background 0.2s, transform 0.2s;
        }
        .get-card:hover {
          background: rgba(255,255,255,0.15);
          transform: translateY(-3px);
        }

        .who-card {
          border-radius: 24px;
          padding: 32px 28px;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .who-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 40px rgba(28,16,8,0.1);
        }

        .faq-item {
          background: white;
          border-radius: 16px;
          border: 1px solid rgba(26,138,138,0.1);
          box-shadow: 0 2px 12px rgba(28,16,8,0.04);
          overflow: hidden;
          transition: box-shadow 0.2s;
        }
        .faq-item:hover { box-shadow: 0 4px 20px rgba(28,16,8,0.08); }
        .faq-item summary {
          padding: 20px 24px;
          cursor: pointer;
          font-weight: 700;
          font-size: 1rem;
          color: var(--ink);
          list-style: none;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          font-family: 'Nunito', sans-serif;
        }
        .faq-item summary::-webkit-details-marker { display: none; }
        .faq-item[open] summary { color: var(--teal-dark); }
        .faq-body {
          padding: 16px 24px 20px;
          color: var(--ink-soft);
          font-size: 0.95rem;
          line-height: 1.75;
          border-top: 1px solid rgba(26,138,138,0.08);
          font-family: 'Nunito', sans-serif;
        }

        .price-box {
          background: var(--teal-light);
          border-radius: 20px;
          padding: 32px 40px;
          border: 1px solid rgba(26,138,138,0.15);
          text-align: center;
          flex-shrink: 0;
        }

        .cta-section {
          background: linear-gradient(135deg, #1A8A8A 0%, #0D5F5F 100%);
          padding: 80px 20px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        .cta-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: white;
          color: var(--teal-dark) !important;
          font-family: 'Nunito', sans-serif;
          font-weight: 800;
          font-size: 1.05rem;
          padding: 16px 36px;
          border-radius: 100px;
          text-decoration: none !important;
          box-shadow: 0 8px 32px rgba(0,0,0,0.2);
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .cta-link:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 40px rgba(0,0,0,0.25);
        }

        .trust-check {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        @media (max-width: 760px) {
          .game-board { grid-template-columns: 1fr; }
          .game-shell { padding: 20px; }
        }
        @media (max-width: 640px) {
          .moment-card { padding: 28px 24px; }
          .hero-grid { grid-template-columns: 1fr !important; }
          .hero-logo { display: none !important; }
          .price-grid { grid-template-columns: 1fr !important; }
          .price-box { padding: 24px !important; }
        }
      `}</style>

      <div className="mp-page">
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 20px" }}>

          {/* ── HERO ── */}
          <section style={{ paddingTop: 64, paddingBottom: 80, position: "relative", overflow: "hidden" }}>
            <div className="hero-blob" style={{ width: 500, height: 500, background: "rgba(26,138,138,0.06)", top: -180, right: -120 }} />
            <div className="hero-blob" style={{ width: 320, height: 320, background: "rgba(232,168,56,0.06)", bottom: -80, left: -100 }} />

            <div className="hero-grid" style={{ display: "grid", gridTemplateColumns: "1fr 180px", gap: 48, alignItems: "center" }}>

              <div>
                <div className="anim-0 ink-chip" style={{ marginBottom: 24 }}>
                  Where Parents Become Math Mentors
                </div>

                <h1 className="anim-1 display" style={{
                  fontSize: "clamp(2.4rem, 5vw, 4.2rem)",
                  fontWeight: 900,
                  lineHeight: 1.08,
                  color: "var(--ink)",
                  marginBottom: 24,
                }}>
                  Your child is stuck.<br />
                  <em style={{ color: "var(--teal)", fontStyle: "italic" }}>You do not have to be.</em>
                </h1>

                <p className="anim-2" style={{
                  fontSize: "1.08rem",
                  color: "var(--ink-soft)",
                  lineHeight: 1.8,
                  maxWidth: 500,
                  marginBottom: 36,
                  fontFamily: "'Nunito', sans-serif",
                }}>
                  Upload the homework question or type it in. MathParenting gives you a calm step by step plan so you can sit next to your child and guide them through it. Even if math was hard for you.
                </p>

                <div className="anim-3" style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 36 }}>
                  <Link href="/chat" className="btn-primary">
                    Start with tonight&rsquo;s homework →
                  </Link>
                  <a href="#game" className="btn-ghost">Play a math game first 🍕</a>
                </div>

                <div className="anim-4" style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                  {["No math degree needed", "K to 12 support", "Cancel anytime"].map((t) => (
                    <div key={t} className="trust-check">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="8" fill="rgba(26,138,138,0.15)" />
                        <path d="M5 8l2 2 4-4" stroke="#1A8A8A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span style={{ fontSize: "0.83rem", color: "var(--ink-muted)", fontWeight: 700 }}>{t}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="hero-logo" style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                <div style={{ position: "relative" }}>
                  <div className="pulse-ring" />
                  <div className="pulse-ring pulse-ring-2" />
                  <div className="logo-float" style={{
                    width: 160,
                    height: 160,
                    borderRadius: 36,
                    overflow: "hidden",
                    boxShadow: "0 24px 60px rgba(26,138,138,0.28), 0 8px 20px rgba(28,16,8,0.12)",
                    position: "relative",
                    zIndex: 1,
                  }}>
                    <Image src="/logo.png" alt="MathParenting" width={160} height={160} style={{ width: "100%", height: "100%", objectFit: "cover" }} priority />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* ── PLAYABLE GAME ── */}
        <section id="game" style={{ background: "var(--teal-light)", padding: "72px 20px" }}>
          <div style={{ maxWidth: 1080, margin: "0 auto" }}>
            <div className="reveal" style={{ textAlign: "center", marginBottom: 36 }}>
              <div className="ink-chip" style={{ marginBottom: 16 }}>Try it right now, free</div>
              <h2 className="display" style={{
                fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)",
                fontWeight: 900,
                color: "var(--ink)",
                lineHeight: 1.2,
                marginBottom: 14,
              }}>
                Play one round with your child
              </h2>
              <p style={{
                color: "var(--ink-soft)",
                fontSize: "1rem",
                maxWidth: 520,
                margin: "0 auto",
                lineHeight: 1.75,
                fontFamily: "'Nunito', sans-serif",
              }}>
                Call your child over. Play together for two minutes. Notice the coaching tips beside the game, that is what MathParenting does for every single homework question.
              </p>
            </div>

            <div className="reveal">
              <KitchenTableGame />
            </div>
          </div>
        </section>

        {/* ── THE MOMENT ── */}
        <section style={{ padding: "64px 20px" }}>
          <div className="moment-card reveal">
            <div style={{ fontSize: "2.4rem", marginBottom: 16 }}>😮‍💨</div>
            <h2 className="display" style={{
              fontSize: "clamp(1.6rem, 3vw, 2.2rem)",
              fontWeight: 700,
              color: "var(--ink)",
              marginBottom: 16,
              lineHeight: 1.25,
            }}>
              You know this exact moment.
            </h2>
            <p style={{ fontSize: "1rem", color: "var(--ink-soft)", lineHeight: 1.85, marginBottom: 24, fontFamily: "'Nunito', sans-serif" }}>
              It is 8pm. Your child brings you a math question. You look at it. Your mind goes blank. You feel that familiar shame of not knowing. Your child is watching. The tension builds. You both give up and feel worse than before.
            </p>
            <div style={{
              borderLeft: "3px solid var(--teal)",
              paddingLeft: 20,
              color: "var(--teal-dark)",
              fontWeight: 700,
              fontSize: "1.05rem",
              fontStyle: "italic",
              fontFamily: "'Playfair Display', serif",
              lineHeight: 1.6,
            }}>
              MathParenting exists for exactly this moment. You do not need to know the answer. You just need to know how to guide your child toward it.
            </div>
          </div>
        </section>

        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 20px" }}>

          {/* ── HOW IT WORKS ── */}
          <section id="how" style={{ padding: "40px 0 80px" }}>
            <div className="reveal" style={{ textAlign: "center", marginBottom: 52 }}>
              <div className="ink-chip" style={{ marginBottom: 16 }}>How it works</div>
              <h2 className="display" style={{
                fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)",
                fontWeight: 900,
                color: "var(--ink)",
                lineHeight: 1.2,
              }}>
                Three steps. One calm session.
              </h2>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 0, maxWidth: 660, margin: "0 auto" }}>
              {[
                {
                  num: "01",
                  icon: "📸",
                  title: "Upload or type the homework question",
                  desc: "Take a photo of the worksheet or type the question. MathParenting reads it instantly and builds a teaching plan around that specific question.",
                },
                {
                  num: "02",
                  icon: "👨‍👩‍👧",
                  title: "Get a step by step teaching plan",
                  desc: "Exactly what to say, when to pause, and what to ask your child at each step. The answer stays hidden until your child works through it with you.",
                },
                {
                  num: "03",
                  icon: "🏠",
                  title: "Cement it with a household activity",
                  desc: "After the question is done, a physical activity using objects already in your home moves the concept from short term to long term memory.",
                },
              ].map((step, i) => (
                <div key={step.num} className="reveal" style={{ display: "flex", gap: 20, position: "relative", paddingBottom: i < 2 ? 28 : 0 }}>
                  {i < 2 && (
                    <div style={{
                      position: "absolute",
                      left: 27,
                      top: 58,
                      bottom: 0,
                      width: 2,
                      background: "linear-gradient(to bottom, var(--teal), transparent)",
                      zIndex: 0,
                    }} />
                  )}
                  <div style={{ flexShrink: 0, position: "relative", zIndex: 1 }}>
                    <div style={{
                      width: 56,
                      height: 56,
                      borderRadius: "50%",
                      background: "var(--teal)",
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "'Playfair Display', serif",
                      fontWeight: 900,
                      fontSize: "0.95rem",
                      boxShadow: "0 4px 16px rgba(26,138,138,0.3)",
                    }}>
                      {step.num}
                    </div>
                  </div>
                  <div className="step-card">
                    <div style={{ fontSize: "1.5rem", marginBottom: 8 }}>{step.icon}</div>
                    <div style={{ fontWeight: 800, fontSize: "1rem", color: "var(--ink)", marginBottom: 8 }}>{step.title}</div>
                    <div style={{ fontSize: "0.92rem", color: "var(--ink-soft)", lineHeight: 1.75, fontFamily: "'Nunito', sans-serif" }}>{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="reveal" style={{ textAlign: "center", marginTop: 44 }}>
              <Link href="/chat" className="btn-primary">Try it with tonight&rsquo;s question →</Link>
            </div>
          </section>
        </div>

        {/* ── WHAT YOU GET - dark teal section ── */}
        <section style={{
          background: "linear-gradient(160deg, #1A8A8A 0%, #0D5F5F 100%)",
          padding: "72px 20px",
          position: "relative",
          overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", width: 500, height: 500,
            borderRadius: "50%", border: "1px solid rgba(255,255,255,0.05)",
            top: -250, right: -100, pointerEvents: "none",
          }} />
          <div style={{ maxWidth: 1080, margin: "0 auto" }}>
            <div className="reveal" style={{ textAlign: "center", marginBottom: 44 }}>
              <div style={{
                display: "inline-flex",
                background: "rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.75)",
                fontSize: "0.75rem",
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                padding: "5px 14px",
                borderRadius: 100,
                marginBottom: 16,
              }}>
                Every single time
              </div>
              <h2 className="display" style={{
                fontSize: "clamp(1.8rem, 3.5vw, 2.6rem)",
                fontWeight: 900,
                color: "white",
                lineHeight: 1.2,
              }}>
                What you get for every question
              </h2>
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))",
              gap: 14,
            }}>
              {[
                { icon: "⏱️", title: "Parent Quick Plan", desc: "What you are working on, the key concept, and a warm opening question to start the session together with your child." },
                { icon: "👨‍👩‍👧", title: "Step by step teaching guide", desc: "Exactly what to say, when to pause, and what to ask. Collapsible so you open only what you need in the moment." },
                { icon: "💬", title: "What your child might say", desc: "A realistic hint of how your child might respond to the opening question so you are never caught off guard." },
                { icon: "🔒", title: "Answer hidden until earned", desc: "The answer is always there but never shown upfront. Your child discovers it by working through the steps with you." },
                { icon: "🏠", title: "Household activity", desc: "A real physical activity using objects at home to move the concept from homework stress into long term memory." },
                { icon: "🧑‍🏫", title: "If things get hard", desc: "Honest human coaching for stuck, rushing, frustrated, and confident moments. Written fresh for each specific question." },
              ].map((item) => (
                <div key={item.title} className="get-card reveal">
                  <div style={{ fontSize: "1.7rem", marginBottom: 10 }}>{item.icon}</div>
                  <div style={{ color: "white", fontWeight: 800, marginBottom: 6, fontSize: "0.93rem" }}>{item.title}</div>
                  <div style={{ color: "rgba(255,255,255,0.62)", fontSize: "0.87rem", lineHeight: 1.7, fontFamily: "'Nunito', sans-serif" }}>{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 20px" }}>

          {/* ── WHO IT IS FOR ── */}
          <section style={{ padding: "80px 0" }}>
            <div className="reveal" style={{ textAlign: "center", marginBottom: 48 }}>
              <div className="ink-chip" style={{ marginBottom: 16 }}>Who it is for</div>
              <h2 className="display" style={{
                fontSize: "clamp(1.8rem, 3.5vw, 2.6rem)",
                fontWeight: 900,
                color: "var(--ink)",
                lineHeight: 1.2,
              }}>
                Built for the parent at the kitchen table
              </h2>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
              {[
                {
                  emoji: "😰",
                  title: "Math was hard for you",
                  desc: "You do not need to remember how to solve it. MathParenting gives you the words, the steps, and the reasoning. You just need to show up.",
                  bg: "rgba(26,138,138,0.07)",
                  border: "rgba(26,138,138,0.15)",
                },
                {
                  emoji: "⏰",
                  title: "You are exhausted after work",
                  desc: "The plan is designed to be read in 60 seconds. Even on the hardest evenings you can do this. One question. That is all it takes.",
                  bg: "rgba(232,168,56,0.07)",
                  border: "rgba(232,168,56,0.2)",
                },
                {
                  emoji: "😤",
                  title: "Homework time gets tense",
                  desc: "There are built in pause points and coaching for when things go sideways. You always know what to do next, even when your child shuts down.",
                  bg: "rgba(26,138,138,0.07)",
                  border: "rgba(26,138,138,0.15)",
                },
              ].map((card) => (
                <div key={card.title} className="who-card reveal" style={{ background: card.bg, border: `1px solid ${card.border}` }}>
                  <div style={{ fontSize: "2.2rem", marginBottom: 16 }}>{card.emoji}</div>
                  <div className="display" style={{ fontWeight: 700, fontSize: "1.05rem", color: "var(--ink)", marginBottom: 12 }}>
                    {card.title}
                  </div>
                  <div style={{ fontSize: "0.92rem", color: "var(--ink-soft)", lineHeight: 1.8, fontFamily: "'Nunito', sans-serif" }}>
                    {card.desc}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── PRICING ── */}
          <section style={{ padding: "0 0 80px" }}>
            <div className="price-grid reveal" style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 40,
              background: "white",
              borderRadius: 28,
              border: "1px solid rgba(26,138,138,0.12)",
              boxShadow: "0 8px 48px rgba(28,16,8,0.07)",
              padding: "44px 48px",
              alignItems: "center",
            }}>
              <div>
                <div className="ink-chip" style={{ marginBottom: 16 }}>Simple pricing</div>
                <h2 className="display" style={{
                  fontSize: "clamp(1.6rem, 3vw, 2.2rem)",
                  fontWeight: 900,
                  color: "var(--ink)",
                  marginBottom: 12,
                  lineHeight: 1.2,
                }}>
                  Less than 20 minutes of tutoring. For the whole month.
                </h2>
                <p style={{ color: "var(--ink-soft)", fontSize: "1rem", lineHeight: 1.75, maxWidth: 420, fontFamily: "'Nunito', sans-serif" }}>
                  A private tutor costs $40 to $80 an hour and teaches your child once a week. MathParenting helps you teach them every night, for less than a pizza. Cancel anytime and keep access until the end of your billing period.
                </p>
              </div>
              <div className="price-box">
                <div className="display" style={{
                  fontSize: "3.2rem",
                  fontWeight: 900,
                  color: "var(--teal-dark)",
                  lineHeight: 1,
                  marginBottom: 4,
                }}>
                  $12.99
                </div>
                <div style={{ color: "var(--teal)", fontWeight: 700, fontSize: "0.88rem", marginBottom: 20, fontFamily: "'Nunito', sans-serif" }}>
                  USD per month
                </div>
                <Link href="/chat" className="btn-primary" style={{ fontSize: "0.9rem", padding: "11px 22px" }}>
                  Get started →
                </Link>
              </div>
            </div>
          </section>

          {/* ── FAQ ── */}
          <section style={{ padding: "0 0 80px" }}>
            <div className="reveal" style={{ textAlign: "center", marginBottom: 40 }}>
              <div className="ink-chip" style={{ marginBottom: 16 }}>FAQ</div>
              <h2 className="display" style={{
                fontSize: "clamp(1.8rem, 3.5vw, 2.4rem)",
                fontWeight: 900,
                color: "var(--ink)",
              }}>
                Questions parents ask
              </h2>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 700, margin: "0 auto" }}>
              {[
                { q: "Do I need to be good at math?", a: "No. MathParenting gives you the words, the steps, and the reasoning behind each move. You do not need to remember how to do the math. You just need to sit with your child." },
                { q: "Will it just give the answer to my child?", a: "Never. The answer is hidden behind a tap and only revealed after your child works through the steps with your guidance. The entire product is built around discovery, not shortcuts." },
                { q: "What grades does it support?", a: "K to 12. From basic counting and addition all the way to calculus and statistics. Start with whatever your child brought home tonight." },
                { q: "Can I upload a photo of the homework?", a: "Yes. Upload a photo of the worksheet, choose the specific question you want to work on, and the teaching plan is ready in seconds." },
                { q: "What if my child is already frustrated before we start?", a: "Every response includes a section called If things get hard with honest human coaching written specifically for that topic. It covers stuck, rushing, frustrated, and confident moments." },
                { q: "What currency will I be charged in?", a: "Prices are in US dollars. Your bank converts it automatically to your local currency, so it works the same whether you are in Toronto, Texas, or Tokyo." },
              ].map((f) => (
                <details key={f.q} className="faq-item reveal">
                  <summary>
                    <span>{f.q}</span>
                    <span style={{ color: "var(--teal)", fontSize: "1.3rem", flexShrink: 0, fontWeight: 400 }}>+</span>
                  </summary>
                  <div className="faq-body">{f.a}</div>
                </details>
              ))}
            </div>
          </section>
        </div>

        {/* ── BOTTOM CTA ── */}
        <section className="cta-section">
          <div style={{
            position: "absolute", width: 500, height: 500,
            borderRadius: "50%", border: "1px solid rgba(255,255,255,0.07)",
            top: -250, right: -100, pointerEvents: "none",
          }} />
          <div style={{
            position: "absolute", width: 350, height: 350,
            borderRadius: "50%", border: "1px solid rgba(255,255,255,0.05)",
            bottom: -180, left: -60, pointerEvents: "none",
          }} />

          <div style={{ maxWidth: 580, margin: "0 auto", position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
              <div style={{
                width: 76,
                height: 76,
                borderRadius: 20,
                overflow: "hidden",
                boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
              }}>
                <Image src="/logo.png" alt="MathParenting" width={76} height={76} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            </div>

            <h2 className="display" style={{
              fontSize: "clamp(2rem, 4vw, 3.2rem)",
              fontWeight: 900,
              color: "white",
              lineHeight: 1.15,
              marginBottom: 20,
            }}>
              One question tonight.<br />
              <em style={{ opacity: 0.82 }}>That is all it takes to start.</em>
            </h2>

            <p style={{
              color: "rgba(255,255,255,0.72)",
              fontSize: "1.05rem",
              lineHeight: 1.75,
              marginBottom: 36,
              fontFamily: "'Nunito', sans-serif",
            }}>
              You do not need to prepare. Just bring the question your child is stuck on and MathParenting walks you through the rest.
            </p>

            <Link href="/chat" className="cta-link">
              Start with tonight&rsquo;s homework →
            </Link>

            <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.85rem", marginTop: 20, fontFamily: "'Nunito', sans-serif" }}>
              USD 12.99 per month. Cancel anytime.
            </div>
          </div>
        </section>

        <div style={{ textAlign: "center", padding: "24px 20px", color: "var(--ink-muted)", fontSize: "0.8rem", fontFamily: "'Nunito', sans-serif" }}>
          © {year.current} MathParenting. Learning support, not a replacement for school instruction.
        </div>
      </div>
    </>
  );
}
