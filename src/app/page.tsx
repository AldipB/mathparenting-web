// src/app/page.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function randInt(lo: number, hi: number) {
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ================================================================== */
/* GAME 1: NUMBER POP - the fun one                                    */
/* ================================================================== */

type PopLevel = "easy" | "medium" | "times" | "teen";

const POP_LEVELS: Record<PopLevel, { label: string; sub: string; op: "+" | "×" }> = {
  easy: { label: "Make it!", sub: "ages 5 to 7", op: "+" },
  medium: { label: "Bigger sums", sub: "ages 7 to 9", op: "+" },
  times: { label: "Times attack", sub: "ages 9 to 12", op: "×" },
  teen: { label: "Integer storm", sub: "ages 13 to 18", op: "+" },
};

const TIMES_TARGETS = [12, 16, 18, 20, 24, 36];

function makePopTarget(level: PopLevel): number {
  if (level === "easy") return randInt(6, 10);
  if (level === "medium") return randInt(11, 18);
  if (level === "teen") return randInt(-9, 12);
  return TIMES_TARGETS[randInt(0, TIMES_TARGETS.length - 1)];
}

function factorPairs(n: number): Array<[number, number]> {
  const pairs: Array<[number, number]> = [];
  for (let a = 2; a * a <= n; a++) {
    if (n % a === 0 && n / a <= 12) pairs.push([a, n / a]);
  }
  return pairs.length ? pairs : [[2, Math.round(n / 2)]];
}

function makePopBoard(level: PopLevel, target: number): number[] {
  const nums: number[] = [];
  if (level === "times") {
    const pairs = factorPairs(target);
    for (let i = 0; i < 3; i++) {
      const [a, b] = pairs[randInt(0, pairs.length - 1)];
      nums.push(a, b);
    }
    while (nums.length < 12) nums.push(randInt(2, 9));
  } else if (level === "teen") {
    const inRange = (n: number) => n >= -12 && n <= 12 && n !== 0;
    let added = 0;
    let guard = 0;
    while (added < 3 && guard < 60) {
      guard++;
      const a = randInt(-12, 12);
      if (a === 0) continue;
      const b = target - a;
      if (!inRange(b)) continue;
      nums.push(a, b);
      added++;
    }
    while (nums.length < 12) {
      const n = randInt(-12, 12);
      if (n !== 0) nums.push(n);
    }
  } else {
    const maxN = level === "easy" ? 9 : 12;
    for (let i = 0; i < 3; i++) {
      const a = randInt(1, Math.min(target - 1, maxN));
      const b = target - a;
      if (b >= 1 && b <= maxN) nums.push(a, b);
      else nums.push(randInt(1, maxN), randInt(1, maxN));
    }
    while (nums.length < 12) nums.push(randInt(1, maxN));
  }
  return shuffle(nums);
}

const BUBBLE_COLORS = ["#1A8A8A", "#E8A838", "#D96C4F", "#5B8DC9", "#7FB069", "#B77BC4"];

const GAME_OVER_LINES = [
  "High fives all around! 🙌",
  "Your team is getting dangerous. 😎",
  "The kitchen table champions! 🏆",
  "Math has never been this loud. 🎉",
];

function ConfettiBurst() {
  return (
    <div className="confetti" aria-hidden>
      {Array.from({ length: 16 }, (_, i) => (
        <span
          key={i}
          className="confetti-p"
          style={
            {
              left: `${randInt(15, 85)}%`,
              background: BUBBLE_COLORS[i % BUBBLE_COLORS.length],
              animationDelay: `${(i % 8) * 30}ms`,
              "--dx": `${randInt(-140, 140)}px`,
              "--rot": `${randInt(180, 540)}deg`,
            } as any
          }
        />
      ))}
    </div>
  );
}

const HERO_DOODLES = [
  { e: "➕", top: "10%", left: "4%", d: "0s", s: "1.6rem" },
  { e: "✖️", top: "72%", left: "8%", d: "1.4s", s: "1.2rem" },
  { e: "➗", top: "16%", left: "90%", d: "0.7s", s: "1.4rem" },
  { e: "🔢", top: "82%", left: "88%", d: "2s", s: "1.5rem" },
  { e: "⭐", top: "4%", left: "52%", d: "1s", s: "1.1rem" },
  { e: "💚", top: "55%", left: "95%", d: "2.6s", s: "1.1rem" },
];

const GAME_DOODLES = [
  { e: "🎲", top: "8%", left: "5%", d: "0.4s", s: "1.5rem" },
  { e: "🧮", top: "75%", left: "7%", d: "1.8s", s: "1.4rem" },
  { e: "✨", top: "12%", left: "92%", d: "1s", s: "1.3rem" },
  { e: "🎯", top: "80%", left: "90%", d: "2.4s", s: "1.4rem" },
];

function Doodles({ items }: { items: typeof HERO_DOODLES }) {
  return (
    <>
      {items.map((d, i) => (
        <span
          key={i}
          className="doodle"
          style={{ top: d.top, left: d.left, animationDelay: d.d, fontSize: d.s }}
        >
          {d.e}
        </span>
      ))}
    </>
  );
}

/* Animated parent and child learning together, original illustration */
function LearningScene() {
  return (
    <svg viewBox="0 0 520 340" className="learning-scene" aria-hidden="true" focusable="false">
      {/* ground shadow */}
      <ellipse cx="260" cy="322" rx="160" ry="10" fill="rgba(28,16,8,0.06)" />

      {/* speech bubble: parent asks */}
      <g className="ls-pop-1">
        <rect x="216" y="58" width="70" height="36" rx="13" fill="#ffffff" stroke="#1A8A8A" strokeWidth="2.5" />
        <polygon points="238,94 252,94 242,110" fill="#ffffff" stroke="#1A8A8A" strokeWidth="2.5" strokeLinejoin="round" />
        <text x="251" y="83" textAnchor="middle" fontSize="19" fontWeight="800" fill="#0D5F5F" fontFamily="Nunito, sans-serif">2 + 3</text>
      </g>

      {/* speech bubble: child answers */}
      <g className="ls-pop-2">
        <rect x="316" y="40" width="58" height="34" rx="13" fill="#ffffff" stroke="#E8A838" strokeWidth="2.5" />
        <polygon points="346,74 360,74 354,90" fill="#ffffff" stroke="#E8A838" strokeWidth="2.5" strokeLinejoin="round" />
        <text x="345" y="64" textAnchor="middle" fontSize="19" fontWeight="800" fill="#B07A1F" fontFamily="Nunito, sans-serif">= 5</text>
      </g>

      {/* pulsing heart between them */}
      <g className="ls-heart">
        <path
          d="M262 116 c-4 -8 -16 -8 -16 2 c0 8 10 13 16 18 c6 -5 16 -10 16 -18 c0 -10 -12 -10 -16 -2 z"
          fill="#D96C4F"
        />
      </g>

      {/* floating math symbols rising from the book */}
      <text className="ls-float-1" x="236" y="202" fontSize="17" fontWeight="800" fill="#0D5F5F" fontFamily="Nunito, sans-serif">+</text>
      <text className="ls-float-2" x="270" y="198" fontSize="16" fontWeight="800" fill="#1A8A8A" fontFamily="Nunito, sans-serif">×</text>
      <text className="ls-float-3" x="252" y="206" fontSize="15" fontWeight="800" fill="#E8A838" fontFamily="Nunito, sans-serif">½</text>

      {/* PARENT, left, teal */}
      <g className="ls-parent">
        {/* body */}
        <rect x="150" y="170" width="72" height="84" rx="32" fill="#1A8A8A" />
        {/* arm reaching toward the book */}
        <rect x="202" y="186" width="58" height="13" rx="6.5" fill="#1A8A8A" transform="rotate(16 202 192)" />
        {/* head */}
        <circle cx="186" cy="140" r="30" fill="#F4C99B" />
        {/* hair */}
        <path d="M156 140 a30 30 0 0 1 60 0 z" fill="#4A3728" />
        {/* face */}
        <circle cx="178" cy="146" r="2.6" fill="#1C1008" />
        <circle cx="196" cy="146" r="2.6" fill="#1C1008" />
        <path d="M180 156 q7 6 14 0" stroke="#1C1008" strokeWidth="2" fill="none" strokeLinecap="round" />
      </g>

      {/* CHILD, right, amber, smaller */}
      <g className="ls-child">
        {/* body */}
        <rect x="316" y="192" width="60" height="64" rx="26" fill="#E8A838" />
        {/* arm toward the pencil */}
        <rect x="296" y="200" width="48" height="11" rx="5.5" fill="#E8A838" transform="rotate(-14 344 206)" />
        {/* head */}
        <circle cx="346" cy="166" r="24" fill="#F4C99B" />
        {/* hair and bun */}
        <path d="M322 166 a24 24 0 0 1 48 0 z" fill="#4A3728" />
        <circle cx="346" cy="138" r="9" fill="#4A3728" />
        {/* face */}
        <circle cx="338" cy="170" r="2.3" fill="#1C1008" />
        <circle cx="354" cy="170" r="2.3" fill="#1C1008" />
        <path d="M340 178 q6 5 12 0" stroke="#1C1008" strokeWidth="2" fill="none" strokeLinecap="round" />
      </g>

      {/* wiggling pencil over the book */}
      <g className="ls-pencil">
        <rect x="288" y="184" width="30" height="8" rx="3" fill="#F5C542" transform="rotate(-32 290 190)" />
        <polygon points="283,198 291,189 296,197" fill="#4A3728" />
      </g>

      {/* table, drawn after figures so it overlaps their laps */}
      <rect x="112" y="230" width="296" height="16" rx="8" fill="#C9A36B" />
      <rect x="146" y="246" width="14" height="72" rx="6" fill="#B08A55" />
      <rect x="360" y="246" width="14" height="72" rx="6" fill="#B08A55" />

      {/* cozy mug */}
      <rect x="142" y="208" width="18" height="22" rx="4" fill="#D96C4F" />
      <path d="M160 213 q10 0 10 7 q0 7 -10 7" stroke="#D96C4F" strokeWidth="3.5" fill="none" />

      {/* open book on the table */}
      <g>
        <path d="M208 222 q52 -16 104 0 l0 9 q-52 -13 -104 0 z" fill="#ffffff" stroke="#0D5F5F" strokeWidth="2.5" strokeLinejoin="round" />
        <line x1="260" y1="208" x2="260" y2="229" stroke="#0D5F5F" strokeWidth="2.5" />
        <line x1="222" y1="219" x2="248" y2="214" stroke="#B9D8D8" strokeWidth="2" strokeLinecap="round" />
        <line x1="272" y1="214" x2="298" y2="219" stroke="#B9D8D8" strokeWidth="2" strokeLinecap="round" />
      </g>
    </svg>
  );
}

function NumberPopGame() {
  const [level, setLevel] = useState<PopLevel>("easy");
  const [phase, setPhase] = useState<"idle" | "playing" | "over">("idle");
  const [target, setTarget] = useState(8);
  const [board, setBoard] = useState<number[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [shaking, setShaking] = useState<number[]>([]);
  const [popping, setPopping] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [best, setBest] = useState(0);
  const [boardKey, setBoardKey] = useState(0);
  const [confetti, setConfetti] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    try {
      const b = Number(localStorage.getItem("mp.numberpop.best") || "0");
      if (Number.isFinite(b)) setBest(b);
    } catch {}
  }, []);

  const newBoard = useCallback((lvl: PopLevel) => {
    const t = makePopTarget(lvl);
    setTarget(t);
    setBoard(makePopBoard(lvl, t));
    setColors(Array.from({ length: 12 }, () => BUBBLE_COLORS[randInt(0, BUBBLE_COLORS.length - 1)]));
    setSelected(null);
    setPopping([]);
    setShaking([]);
    setBoardKey((k) => k + 1);
  }, []);

  const endGame = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setPhase("over");
    setScore((s) => {
      try {
        const prevBest = Number(localStorage.getItem("mp.numberpop.best") || "0");
        if (s > prevBest) {
          localStorage.setItem("mp.numberpop.best", String(s));
          setBest(s);
        }
      } catch {}
      return s;
    });
  }, []);

  const startGame = useCallback(
    (lvl: PopLevel) => {
      setLevel(lvl);
      setScore(0);
      setStreak(0);
      setTimeLeft(60);
      setPhase("playing");
      newBoard(lvl);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            endGame();
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    },
    [newBoard, endGame]
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function tapBubble(i: number) {
    if (phase !== "playing" || popping.length) return;

    if (selected === null) {
      setSelected(i);
      return;
    }
    if (selected === i) {
      setSelected(null);
      return;
    }

    const a = board[selected];
    const b = board[i];
    const hit = level === "times" ? a * b === target : a + b === target;

    if (hit) {
      const gained = 10 + streak * 2;
      setScore((s) => s + gained);
      setStreak((s) => s + 1);
      setPopping([selected, i]);
      setSelected(null);
      setConfetti((c) => c + 1);
      setTimeout(() => newBoard(level), 420);
    } else {
      setShaking([selected, i]);
      setStreak(0);
      setSelected(null);
      setTimeout(() => setShaking([]), 420);
    }
  }

  const op = POP_LEVELS[level].op;

  return (
    <div className="pop-wrap">
      {phase === "idle" && (
        <div className="pop-idle">
          <div className="pop-idle-emoji">⚡</div>
          <div className="pop-idle-title display">Number Pop</div>
          <p className="pop-idle-text">
            60 seconds. Tap two bubbles that make the target number. Take turns with your child:
            you find one pair, they find the next. Beat your family best!
          </p>
          <div className="pop-levels">
            {(Object.keys(POP_LEVELS) as PopLevel[]).map((lvl) => (
              <button key={lvl} className="pop-level-btn" onClick={() => startGame(lvl)}>
                <span className="pop-level-label">{POP_LEVELS[lvl].label}</span>
                <span className="pop-level-sub">{POP_LEVELS[lvl].sub}</span>
              </button>
            ))}
          </div>
          {best > 0 && <div className="pop-best">Family best: {best} 🏆</div>}
        </div>
      )}

      {phase === "playing" && (
        <div className="pop-game">
          {confetti > 0 && <ConfettiBurst key={confetti} />}
          <div className="pop-hud">
            <div className="pop-target">
              Make <span className="pop-target-num">{target}</span>
              <span className="pop-target-op">{op === "+" ? "by adding" : "by multiplying"}</span>
            </div>
            <div className="pop-stats">
              <span className="pop-score">⭐ {score}</span>
              {streak > 1 && <span className="pop-streak">🔥 x{streak}</span>}
            </div>
          </div>

          <div className="pop-timer-track">
            <div
              className="pop-timer-bar"
              style={{
                width: `${(timeLeft / 60) * 100}%`,
                background: timeLeft <= 10 ? "#D96C4F" : "var(--teal)",
              }}
            />
          </div>

          <div className="pop-grid" key={boardKey}>
            {board.map((n, i) => (
              <button
                key={`${boardKey}-${i}`}
                className={[
                  "pop-bubble",
                  selected === i ? "pop-bubble-sel" : "",
                  shaking.includes(i) ? "pop-bubble-shake" : "",
                  popping.includes(i) ? "pop-bubble-pop" : "",
                ].join(" ")}
                style={{ background: colors[i], animationDelay: `${(i % 6) * 45}ms` }}
                onClick={() => tapBubble(i)}
              >
                {n}
              </button>
            ))}
          </div>

          <div className="pop-hint">
            Tap two bubbles that {op === "+" ? "add up" : "multiply"} to {target}
          </div>
        </div>
      )}

      {phase === "over" && (
        <div className="pop-idle">
          <div className="pop-idle-emoji">🎉</div>
          <div className="pop-idle-title display">Time&rsquo;s up!</div>
          <div className="pop-final">⭐ {score} points</div>
          <p className="pop-idle-text">
            {GAME_OVER_LINES[score % GAME_OVER_LINES.length]}
            {score >= best && score > 0 ? " New family best!" : best > 0 ? ` Family best: ${best}.` : ""}
          </p>
          <div className="pop-levels">
            <button className="pop-level-btn pop-level-again" onClick={() => startGame(level)}>
              <span className="pop-level-label">Play again</span>
              <span className="pop-level-sub">same level</span>
            </button>
            <button className="pop-level-btn" onClick={() => setPhase("idle")}>
              <span className="pop-level-label">Change level</span>
              <span className="pop-level-sub">easy · sums · times</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/* GAME 2: PIZZA FRACTIONS                                             */
/* ================================================================== */

function makePizzaRound() {
  const slices = [4, 6, 8][randInt(0, 2)];
  const target = randInt(1, slices - 1);
  return { slices, target };
}

function PizzaGame() {
  const [round, setRound] = useState(makePizzaRound);
  const [shaded, setShaded] = useState<Set<number>>(new Set());
  const [feedback, setFeedback] = useState<"idle" | "right" | "wrong">("idle");
  const [score, setScore] = useState(0);

  const W = 240;
  const cx = W / 2;
  const cy = W / 2;
  const r = 100;
  const sliceAngle = (Math.PI * 2) / round.slices;
  const wedgePath = (i: number) => {
    const a0 = i * sliceAngle - Math.PI / 2;
    const a1 = (i + 1) * sliceAngle - Math.PI / 2;
    const x0 = cx + r * Math.cos(a0);
    const y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy + r * Math.sin(a1);
    return `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1} Z`;
  };

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

  function check() {
    if (shaded.size === round.target) {
      setScore((s) => s + 1);
      setFeedback("right");
    } else setFeedback("wrong");
  }

  function next() {
    setRound(makePizzaRound());
    setShaded(new Set());
    setFeedback("idle");
  }

  return (
    <div className="mini-game">
      <div className="mini-question">
        Shade{" "}
        <span className="game-fraction">
          <span>{round.target}</span>
          <span className="game-fraction-bar" />
          <span>{round.slices}</span>
        </span>{" "}
        of the pizza
      </div>
      <svg viewBox={`0 0 ${W} ${W}`} className="game-pizza" role="img" aria-label="Pizza divided into slices">
        <circle cx={cx} cy={cy} r={r + 8} fill="#F5DEB8" />
        <circle cx={cx} cy={cy} r={r} fill="#FBEFD8" stroke="#1C1008" strokeWidth={2} />
        {Array.from({ length: round.slices }, (_, i) => (
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
      <div className="mini-actions">
        {feedback !== "right" ? (
          <button className="game-check" onClick={check}>
            Check our pizza
          </button>
        ) : (
          <button className="game-next" onClick={next}>
            Next pizza →
          </button>
        )}
      </div>
      <div className="game-feedback" aria-live="polite">
        {feedback === "right" && (
          <div className="game-right">
            <span className="game-burst">🎉</span> Delicious! Score: {score}
          </div>
        )}
        {feedback === "wrong" && (
          <div className="game-wrong">Count the shaded slices together and try again!</div>
        )}
      </div>
    </div>
  );
}

/* ================================================================== */
/* GAME 3: COUNT TOGETHER                                              */
/* ================================================================== */

const COUNT_ITEMS = ["🍎", "🍪", "🪙", "⭐", "🍓", "⚽"];

function makeCountRound() {
  const emoji = COUNT_ITEMS[randInt(0, COUNT_ITEMS.length - 1)];
  const count = randInt(3, 9);
  const options = new Set<number>([count]);
  while (options.size < 4) {
    const n = count + randInt(-2, 2);
    if (n >= 1) options.add(n);
  }
  return { emoji, count, options: shuffle([...options]) };
}

function CountGame() {
  const [round, setRound] = useState(makeCountRound);
  const [key, setKey] = useState(0);
  const [feedback, setFeedback] = useState<"idle" | "right" | "wrong">("idle");
  const [score, setScore] = useState(0);

  function answer(n: number) {
    if (feedback === "right") return;
    if (n === round.count) {
      setScore((s) => s + 1);
      setFeedback("right");
    } else setFeedback("wrong");
  }

  function next() {
    setRound(makeCountRound());
    setKey((k) => k + 1);
    setFeedback("idle");
  }

  return (
    <div className="mini-game">
      <div className="mini-question">How many do you see?</div>
      <div className="game-emojis" key={key}>
        {Array.from({ length: round.count }, (_, i) => (
          <span key={i} className="game-emoji" style={{ animationDelay: `${i * 70}ms` }}>
            {round.emoji}
          </span>
        ))}
      </div>
      <div className="game-options">
        {round.options.map((n) => (
          <button key={n} className="game-opt" onClick={() => answer(n)}>
            {n}
          </button>
        ))}
      </div>
      <div className="game-feedback" aria-live="polite">
        {feedback === "right" && (
          <div className="game-right">
            <span className="game-burst">🎉</span> Counted it! Score: {score}
            <button className="game-next" onClick={next}>
              Next one →
            </button>
          </div>
        )}
        {feedback === "wrong" && (
          <div className="game-wrong">Point and count out loud together, then pick again!</div>
        )}
      </div>
    </div>
  );
}

/* ================================================================== */
/* GAME SHELL with tabs                                                */
/* ================================================================== */

type GameMode = "pop" | "pizza" | "count";

function KitchenTableGames() {
  const [mode, setMode] = useState<GameMode>("pop");

  return (
    <div className="game-shell">
      <div className="game-tabs" role="tablist" aria-label="Choose a game">
        <button
          role="tab"
          aria-selected={mode === "pop"}
          className={`game-tab ${mode === "pop" ? "game-tab-on" : ""}`}
          onClick={() => setMode("pop")}
        >
          ⚡ Number Pop <span className="game-tab-age">the fast one</span>
        </button>
        <button
          role="tab"
          aria-selected={mode === "pizza"}
          className={`game-tab ${mode === "pizza" ? "game-tab-on" : ""}`}
          onClick={() => setMode("pizza")}
        >
          🍕 Pizza fractions <span className="game-tab-age">ages 7+</span>
        </button>
        <button
          role="tab"
          aria-selected={mode === "count"}
          className={`game-tab ${mode === "count" ? "game-tab-on" : ""}`}
          onClick={() => setMode("count")}
        >
          🍎 Count together <span className="game-tab-age">ages 3 to 6</span>
        </button>
      </div>

      {mode === "pop" && <NumberPopGame />}
      {mode === "pizza" && <PizzaGame />}
      {mode === "count" && <CountGame />}

      <div className="game-foot">
        💡 Take turns. Cheer the wrong answers as loudly as the right ones. That is the whole secret.
      </div>
    </div>
  );
}

/* ================================================================== */
/* PAGE                                                                */
/* ================================================================== */

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
            70%  { transform: scale(1.12); }
            100% { opacity: 1; transform: scale(1); }
          }
          @keyframes burst {
            0%   { transform: scale(0.6) rotate(-12deg); }
            60%  { transform: scale(1.35) rotate(8deg); }
            100% { transform: scale(1) rotate(0deg); }
          }
          @keyframes bubblePop {
            0%   { transform: scale(1); opacity: 1; }
            100% { transform: scale(1.6); opacity: 0; }
          }
          @keyframes bubbleShake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-6px); }
            75% { transform: translateX(6px); }
          }
          @keyframes confettiFly {
            0% { transform: translate(0, 0) rotate(0deg); opacity: 1; }
            100% { transform: translate(var(--dx), 170px) rotate(var(--rot)); opacity: 0; }
          }
          @keyframes doodleFloat {
            0%, 100% { transform: translateY(0) rotate(-8deg); }
            50% { transform: translateY(-18px) rotate(8deg); }
          }
          @keyframes wobble {
            0% { transform: rotate(-2deg); }
            25% { transform: rotate(6deg) scale(1.06); }
            50% { transform: rotate(-6deg); }
            75% { transform: rotate(3deg); }
            100% { transform: rotate(-2deg); }
          }
          @keyframes twinkle {
            0%, 100% { opacity: 0.5; transform: scale(0.85) rotate(0deg); }
            50% { opacity: 1; transform: scale(1.15) rotate(18deg); }
          }
          .confetti-p { animation: confettiFly 0.9s ease-out forwards; }
          .doodle { animation: doodleFloat 7s ease-in-out infinite; }
          .logo-float:hover { animation: wobble 0.7s ease; }
          .sparkle { animation: twinkle 1.6s ease-in-out infinite; }

          @keyframes lsBob {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-4px); }
          }
          @keyframes lsWrite {
            0%, 100% { transform: rotate(-4deg); }
            50% { transform: rotate(5deg); }
          }
          @keyframes lsPop {
            0%, 12% { transform: scale(0); opacity: 0; }
            20%, 66% { transform: scale(1); opacity: 1; }
            76%, 100% { transform: scale(0); opacity: 0; }
          }
          @keyframes lsHeart {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.2); }
          }
          @keyframes lsFloat {
            0% { transform: translateY(0); opacity: 0; }
            18% { opacity: 0.85; }
            100% { transform: translateY(-48px); opacity: 0; }
          }
          .ls-parent { animation: lsBob 3.2s ease-in-out infinite; }
          .ls-child { animation: lsBob 3.2s ease-in-out 1.6s infinite; }
          .ls-pencil { animation: lsWrite 1.1s ease-in-out infinite; }
          .ls-pop-1 { animation: lsPop 7s ease-in-out infinite; }
          .ls-pop-2 { animation: lsPop 7s ease-in-out 3.5s infinite; }
          .ls-heart { animation: lsHeart 1.8s ease-in-out infinite; }
          .ls-float-1 { animation: lsFloat 5s linear infinite; }
          .ls-float-2 { animation: lsFloat 5s linear 1.7s infinite; }
          .ls-float-3 { animation: lsFloat 5s linear 3.4s infinite; }
          .anim-0 { animation: fadeUp 0.7s ease both; }
          .anim-1 { animation: fadeUp 0.7s 0.1s ease both; }
          .anim-2 { animation: fadeUp 0.7s 0.2s ease both; }
          .anim-3 { animation: fadeUp 0.7s 0.3s ease both; }
          .anim-4 { animation: fadeUp 0.7s 0.4s ease both; }
          .logo-float { animation: floatLogo 4s ease-in-out infinite; }
          .game-emoji { animation: popIn 0.4s ease both; display: inline-block; }
          .game-burst { display: inline-block; animation: burst 0.5s ease both; }
          .pop-bubble { animation: popIn 0.35s ease both; }
          .pop-bubble-pop { animation: bubblePop 0.4s ease both !important; }
          .pop-bubble-shake { animation: bubbleShake 0.4s ease both !important; }
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

        /* ---------- game shell ---------- */
        .game-shell {
          background: white;
          border-radius: 28px;
          border: 1px solid rgba(26,138,138,0.14);
          box-shadow: 0 12px 56px rgba(28,16,8,0.1);
          padding: 28px;
          max-width: 720px;
          margin: 0 auto;
        }
        .game-tabs {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 22px;
          justify-content: center;
        }
        .game-tab {
          font-family: 'Nunito', sans-serif;
          font-weight: 800;
          font-size: 0.9rem;
          padding: 10px 16px;
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
        .game-tab-age { font-size: 0.7rem; font-weight: 700; opacity: 0.75; }

        .game-foot {
          margin-top: 22px;
          padding-top: 16px;
          border-top: 1px solid rgba(26,138,138,0.12);
          text-align: center;
          font-size: 0.88rem;
          font-weight: 700;
          color: var(--teal-dark);
          line-height: 1.6;
        }

        /* ---------- number pop ---------- */
        .pop-wrap { min-height: 380px; display: flex; flex-direction: column; justify-content: center; }
        .pop-idle { text-align: center; padding: 12px 8px; }
        .pop-idle-emoji { font-size: 3rem; margin-bottom: 10px; }
        .pop-idle-title { font-size: 1.9rem; font-weight: 900; color: var(--ink); margin-bottom: 12px; }
        .pop-idle-text {
          font-size: 0.97rem;
          color: var(--ink-soft);
          line-height: 1.75;
          max-width: 440px;
          margin: 0 auto 22px;
        }
        .pop-final {
          font-family: 'Playfair Display', serif;
          font-size: 2.4rem;
          font-weight: 900;
          color: var(--teal-dark);
          margin-bottom: 10px;
        }
        .pop-levels { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
        .pop-level-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          padding: 14px 22px;
          border-radius: 18px;
          border: 2px solid rgba(26,138,138,0.3);
          background: white;
          cursor: pointer;
          transition: background 0.15s, transform 0.12s, box-shadow 0.15s;
          font-family: 'Nunito', sans-serif;
        }
        .pop-level-btn:hover {
          background: var(--teal-light);
          transform: translateY(-3px);
          box-shadow: 0 8px 20px rgba(26,138,138,0.2);
        }
        .pop-level-again { background: var(--teal); border-color: var(--teal); }
        .pop-level-again .pop-level-label, .pop-level-again .pop-level-sub { color: white; }
        .pop-level-label { font-weight: 800; font-size: 1rem; color: var(--teal-dark); }
        .pop-level-sub { font-weight: 700; font-size: 0.74rem; color: var(--ink-muted); }
        .pop-best { margin-top: 18px; font-weight: 800; color: var(--amber); font-size: 0.95rem; }

        .pop-game { width: 100%; position: relative; }
        .confetti {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
          z-index: 5;
        }
        .confetti-p {
          position: absolute;
          top: 38%;
          width: 10px;
          height: 10px;
          border-radius: 2px;
        }
        .doodle {
          position: absolute;
          opacity: 0.3;
          pointer-events: none;
          z-index: 0;
        }
        .sparkle { display: inline-block; }

        /* ---------- learning scene ---------- */
        .learning-scene {
          position: absolute;
          bottom: -6px;
          right: -20px;
          width: min(460px, 42vw);
          height: auto;
          opacity: 0.5;
          z-index: 0;
          pointer-events: none;
        }
        .ls-parent, .ls-child, .ls-pencil, .ls-heart,
        .ls-pop-1, .ls-pop-2,
        .ls-float-1, .ls-float-2, .ls-float-3 {
          transform-box: fill-box;
          transform-origin: center;
        }
        .pop-hud {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 10px;
        }
        .pop-target {
          font-family: 'Playfair Display', serif;
          font-weight: 900;
          font-size: 1.3rem;
          color: var(--ink);
          display: flex;
          align-items: baseline;
          gap: 8px;
        }
        .pop-target-num {
          font-size: 2rem;
          color: var(--teal-dark);
          background: var(--teal-light);
          border-radius: 14px;
          padding: 2px 14px;
        }
        .pop-target-op {
          font-family: 'Nunito', sans-serif;
          font-weight: 700;
          font-size: 0.8rem;
          color: var(--ink-muted);
        }
        .pop-stats { display: flex; gap: 12px; align-items: center; font-weight: 800; font-size: 1.05rem; }
        .pop-score { color: var(--teal-dark); }
        .pop-streak { color: #D96C4F; }

        .pop-timer-track {
          height: 8px;
          background: rgba(26,138,138,0.12);
          border-radius: 100px;
          overflow: hidden;
          margin-bottom: 18px;
        }
        .pop-timer-bar { height: 100%; border-radius: 100px; transition: width 1s linear, background 0.3s; }

        .pop-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          max-width: 420px;
          margin: 0 auto;
        }
        .pop-bubble {
          aspect-ratio: 1;
          border-radius: 50%;
          border: none;
          color: white;
          font-family: 'Nunito', sans-serif;
          font-weight: 800;
          font-size: 1.5rem;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(28,16,8,0.18), inset 0 -4px 8px rgba(0,0,0,0.12);
          transition: transform 0.12s, box-shadow 0.12s;
        }
        .pop-bubble:hover { transform: scale(1.07); }
        .pop-bubble-sel {
          outline: 4px solid var(--amber);
          outline-offset: 3px;
          transform: scale(1.1);
        }
        .pop-hint {
          text-align: center;
          margin-top: 16px;
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--ink-muted);
        }

        /* ---------- mini games ---------- */
        .mini-game { text-align: center; min-height: 380px; display: flex; flex-direction: column; justify-content: center; align-items: center; }
        .mini-question {
          font-family: 'Playfair Display', serif;
          font-weight: 700;
          font-size: 1.3rem;
          color: var(--ink);
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .mini-actions { margin-top: 4px; }

        .game-fraction {
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          line-height: 1.05;
          font-family: 'Nunito', sans-serif;
          font-weight: 800;
          color: var(--teal-dark);
          font-size: 1.1rem;
        }
        .game-fraction-bar {
          width: 22px;
          height: 2.5px;
          background: var(--teal-dark);
          border-radius: 2px;
          margin: 2px 0;
        }

        .game-pizza { width: 100%; max-width: 230px; height: auto; margin: 0 auto 14px; display: block; }

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

        .game-emojis {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 12px;
          font-size: 2.4rem;
          min-height: 110px;
          align-items: center;
          margin-bottom: 14px;
          max-width: 360px;
        }
        .game-options { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
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

        .game-feedback { min-height: 52px; margin-top: 14px; }
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
        .game-wrong { color: var(--amber); font-weight: 800; font-size: 0.95rem; }

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
        .get-card:hover { background: rgba(255,255,255,0.15); transform: translateY(-3px); }

        .who-card {
          border-radius: 24px;
          padding: 32px 28px;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .who-card:hover { transform: translateY(-4px); box-shadow: 0 16px 40px rgba(28,16,8,0.1); }

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
        .cta-link:hover { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(0,0,0,0.25); }

        .trust-check { display: flex; align-items: center; gap: 6px; }

        @media (max-width: 640px) {
          .moment-card { padding: 28px 24px; }
          .hero-grid { grid-template-columns: 1fr !important; }
          .hero-logo { display: none !important; }
          .learning-scene { display: none; }
          .price-grid { grid-template-columns: 1fr !important; }
          .price-box { padding: 24px !important; }
          .game-shell { padding: 18px; }
          .pop-grid { gap: 9px; }
          .pop-bubble { font-size: 1.25rem; }
        }
      `}</style>

      <div className="mp-page">
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 20px" }}>

          {/* ── HERO ── */}
          <section style={{ paddingTop: 64, paddingBottom: 80, position: "relative", overflow: "hidden" }}>
            <Doodles items={HERO_DOODLES} />
            <LearningScene />
            <div className="hero-blob" style={{ width: 500, height: 500, background: "rgba(26,138,138,0.06)", top: -180, right: -120 }} />
            <div className="hero-blob" style={{ width: 320, height: 320, background: "rgba(232,168,56,0.06)", bottom: -80, left: -100 }} />

            <div className="hero-grid" style={{ display: "grid", gridTemplateColumns: "1fr 180px", gap: 48, alignItems: "center", position: "relative", zIndex: 1 }}>

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
                    Start with tonight&rsquo;s homework <span className="sparkle">✨</span>
                  </Link>
                  <a href="#game" className="btn-ghost">Play a game together ⚡</a>
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

        {/* ── PLAYABLE GAMES ── */}
        <section id="game" style={{ background: "var(--teal-light)", padding: "72px 20px", position: "relative", overflow: "hidden" }}>
          <Doodles items={GAME_DOODLES} />
          <div style={{ maxWidth: 1080, margin: "0 auto", position: "relative" }}>
            <div className="reveal" style={{ textAlign: "center", marginBottom: 36 }}>
              <div className="ink-chip" style={{ marginBottom: 16 }}>Free games, no sign up</div>
              <h2 className="display" style={{
                fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)",
                fontWeight: 900,
                color: "var(--ink)",
                lineHeight: 1.2,
                marginBottom: 14,
              }}>
                Bored of homework? Play instead.
              </h2>
              <p style={{
                color: "var(--ink-soft)",
                fontSize: "1rem",
                maxWidth: 520,
                margin: "0 auto",
                lineHeight: 1.75,
                fontFamily: "'Nunito', sans-serif",
              }}>
                Call your child over. Sixty loud, giggly seconds of Number Pop counts as math practice too. Some of the best learning happens when nobody is trying.
              </p>
            </div>

            <div className="reveal">
              <KitchenTableGames />
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
                  One price. Every evening together.
                </h2>
                <p style={{ color: "var(--ink-soft)", fontSize: "1rem", lineHeight: 1.75, maxWidth: 440, fontFamily: "'Nunito', sans-serif" }}>
                  MathParenting is not about finishing homework faster. It is about you and your child figuring things out side by side, laughing at the wrong answers, and ending the evening closer than you started. One subscription covers every grade, every question, every night. Cancel anytime and keep access until the end of your billing period.
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
                { q: "What currency will I be charged in?", a: "Prices are in US dollars. Your bank converts it automatically to your local currency, so it works the same wherever your kitchen table is." },
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
