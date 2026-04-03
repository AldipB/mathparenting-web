// src/app/page.tsx
import Link from "next/link";
import Image from "next/image";

const BRAND = "#E0F4F4";
const TEAL = "#1A8A8A";
const TEAL_DARK = "#0F6B6B";
const ORANGE = "#F5A623";

const STEPS = [
  {
    num: "1",
    icon: "📸",
    title: "Upload or type the homework question",
    desc: "Take a photo of the worksheet or type the question. MathParenting reads it instantly.",
  },
  {
    num: "2",
    icon: "👨‍👩‍👧",
    title: "Get a step by step teaching plan",
    desc: "You get exactly what to say, when to pause, and what questions to ask your child.",
  },
  {
    num: "3",
    icon: "🏠",
    title: "Cement it with a household activity",
    desc: "A real physical activity using objects at home so the concept sticks in long term memory.",
  },
];

const FAQ = [
  {
    q: "Do I need to be good at math?",
    a: "No. MathParenting gives you the words, the steps, and the reasoning. You just need to sit with your child.",
  },
  {
    q: "Will it just give the answer to my child?",
    a: "Never. The answer is hidden behind a tap. The focus is on your child thinking through it with your guidance.",
  },
  {
    q: "What grades does it support?",
    a: "K to 12. From basic addition to calculus. Start with whatever your child brought home tonight.",
  },
  {
    q: "Can I upload a photo of the homework?",
    a: "Yes. Upload a photo, choose the question you want to work on, and the teaching plan is ready in seconds.",
  },
];

export default function HomePage() {
  return (
    <div style={{ backgroundColor: BRAND, minHeight: "100vh", fontFamily: "'DM Sans', sans-serif" }}>
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />

      <div className="mx-auto w-full max-w-5xl px-4">

        {/* ── HERO ── */}
        <div className="pt-10 pb-12 md:pt-16 md:pb-20 text-center">

          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div
              className="rounded-3xl shadow-lg overflow-hidden"
              style={{ width: 88, height: 88, backgroundColor: BRAND, border: `3px solid rgba(26,138,138,0.15)` }}
            >
              <Image
                src="/logo.png"
                alt="MathParenting"
                width={88}
                height={88}
                className="w-full h-full object-cover"
                priority
              />
            </div>
          </div>

          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold mb-5"
            style={{ backgroundColor: "rgba(26,138,138,0.12)", color: TEAL_DARK }}>
            Where Parents Become Math Mentors
          </div>

          {/* Headline */}
          <h1
            className="text-4xl md:text-6xl font-bold leading-tight text-gray-900 mb-5"
            style={{ fontFamily: "'DM Serif Display', serif", maxWidth: 720, margin: "0 auto 20px" }}
          >
            Your child is stuck on homework.
            <br />
            <span style={{ color: TEAL }}>We show you how to teach it.</span>
          </h1>

          {/* Sub */}
          <p className="text-lg md:text-xl text-gray-600 mb-8 mx-auto" style={{ maxWidth: 560 }}>
            Upload the homework question or type it in. MathParenting gives you a calm, step by step plan so you can sit next to your child and guide them through it, even if math was hard for you.
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Link
              href="/chat"
              className="rounded-2xl px-7 py-4 font-bold text-white text-base shadow-lg transition-all hover:shadow-xl hover:scale-105"
              style={{ backgroundColor: TEAL, letterSpacing: "-0.01em" }}
            >
              Start with tonight's homework →
            </Link>
            <a
              href="#how"
              className="rounded-2xl px-7 py-4 font-semibold text-base border-2 bg-white transition-all hover:bg-gray-50"
              style={{ borderColor: "rgba(26,138,138,0.3)", color: TEAL_DARK }}
            >
              See how it works
            </a>
          </div>

          {/* Trust line */}
          <p className="mt-5 text-sm text-gray-500">
            No math degree needed. No tutors. Just you and your child.
          </p>
        </div>

        {/* ── PROBLEM STATEMENT ── */}
        <div
          className="rounded-3xl p-6 md:p-10 mb-10 text-center"
          style={{ backgroundColor: "white", border: "1px solid rgba(26,138,138,0.15)", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}
        >
          <div className="text-3xl mb-4">😮‍💨</div>
          <h2
            className="text-2xl md:text-3xl font-bold text-gray-900 mb-4"
            style={{ fontFamily: "'DM Serif Display', serif" }}
          >
            Every parent knows this moment.
          </h2>
          <p className="text-gray-600 text-base md:text-lg mx-auto mb-6" style={{ maxWidth: 560 }}>
            Your child brings home a math question. You look at it. You have no idea how to explain it. You feel stuck. Your child feels stuck. The tension builds.
          </p>
          <div
            className="rounded-2xl p-5 mx-auto text-left"
            style={{ backgroundColor: BRAND, maxWidth: 500 }}
          >
            <p className="font-semibold text-gray-900 mb-2">MathParenting fixes this by:</p>
            <ul className="space-y-2 text-gray-700 text-sm">
              <li className="flex items-start gap-2"><span style={{ color: TEAL }}>✓</span> Telling you exactly what to say at each step</li>
              <li className="flex items-start gap-2"><span style={{ color: TEAL }}>✓</span> Showing when to pause so your child can think</li>
              <li className="flex items-start gap-2"><span style={{ color: TEAL }}>✓</span> Keeping the session calm even when your child is frustrated</li>
              <li className="flex items-start gap-2"><span style={{ color: TEAL }}>✓</span> Never giving the answer away. Your child figures it out with your help.</li>
            </ul>
          </div>
        </div>

        {/* ── HOW IT WORKS ── */}
        <div id="how" className="mb-10">
          <div className="text-center mb-8">
            <div className="text-sm font-semibold mb-2" style={{ color: TEAL }}>How it works</div>
            <h2
              className="text-2xl md:text-3xl font-bold text-gray-900"
              style={{ fontFamily: "'DM Serif Display', serif" }}
            >
              Three steps. One calm homework session.
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {STEPS.map((s) => (
              <div
                key={s.num}
                className="rounded-3xl p-6 flex flex-col gap-3"
                style={{ backgroundColor: "white", border: "1px solid rgba(26,138,138,0.15)", boxShadow: "0 2px 16px rgba(0,0,0,0.05)" }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: TEAL }}
                  >
                    {s.num}
                  </div>
                  <div className="text-2xl">{s.icon}</div>
                </div>
                <div className="font-bold text-gray-900">{s.title}</div>
                <div className="text-sm text-gray-600 leading-relaxed">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── WHAT PARENTS GET ── */}
        <div
          className="rounded-3xl p-6 md:p-10 mb-10"
          style={{ backgroundColor: TEAL_DARK, color: "white" }}
        >
          <div className="text-center mb-8">
            <div className="text-sm font-semibold mb-2 opacity-70">Every single time</div>
            <h2
              className="text-2xl md:text-3xl font-bold"
              style={{ fontFamily: "'DM Serif Display', serif" }}
            >
              What you get for every homework question
            </h2>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {[
              { icon: "⏱️", title: "Parent Quick Plan", desc: "What you are working on, the key thing to remember, and the first question to ask your child. Together." },
              { icon: "👨‍👩‍👧", title: "Step by step teaching guide", desc: "Exactly what to say, what to ask, and when to let your child try. Collapsible so you only open what you need." },
              { icon: "🏠", title: "Household activity", desc: "A real physical activity using objects at home to make the concept stick in long term memory." },
              { icon: "🧩", title: "Extra practice questions", desc: "Two similar questions for when your child wants to keep going after solving the homework question." },
              { icon: "🧑‍🏫", title: "If things get hard", desc: "Honest, human coaching for when your child is stuck, rushing, frustrated, or confident. Written for this exact question." },
              { icon: "🔒", title: "Answer hidden until needed", desc: "The answer is always there but never shown upfront. Your child discovers it through the teaching steps." },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl p-4 flex items-start gap-3"
                style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
              >
                <div className="text-2xl flex-shrink-0">{item.icon}</div>
                <div>
                  <div className="font-bold text-sm mb-1">{item.title}</div>
                  <div className="text-sm opacity-75 leading-relaxed">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── WHO IT IS FOR ── */}
        <div className="mb-10 text-center">
          <div className="text-sm font-semibold mb-2" style={{ color: TEAL }}>Who it is for</div>
          <h2
            className="text-2xl md:text-3xl font-bold text-gray-900 mb-8"
            style={{ fontFamily: "'DM Serif Display', serif" }}
          >
            Built for the parent at the kitchen table
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { icon: "😰", title: "Math was hard for you", desc: "You do not need to remember how to do the math. MathParenting gives you the reasoning, the language, and the steps." },
              { icon: "⏰", title: "You are tired after work", desc: "The teaching plan is designed to be read in 60 seconds. You can do this even on the hardest days." },
              { icon: "😤", title: "Homework time gets tense", desc: "The structure helps you stay calm. There are pause points built in so you never have to guess what to do next." },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-3xl p-6 text-left"
                style={{ backgroundColor: "white", border: "1px solid rgba(26,138,138,0.15)", boxShadow: "0 2px 16px rgba(0,0,0,0.05)" }}
              >
                <div className="text-3xl mb-3">{item.icon}</div>
                <div className="font-bold text-gray-900 mb-2">{item.title}</div>
                <div className="text-sm text-gray-600 leading-relaxed">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── FAQ ── */}
        <div className="mb-10">
          <div className="text-center mb-8">
            <div className="text-sm font-semibold mb-2" style={{ color: TEAL }}>FAQ</div>
            <h2
              className="text-2xl md:text-3xl font-bold text-gray-900"
              style={{ fontFamily: "'DM Serif Display', serif" }}
            >
              Questions parents ask
            </h2>
          </div>
          <div className="grid gap-3">
            {FAQ.map((f) => (
              <details
                key={f.q}
                className="rounded-2xl p-5"
                style={{ backgroundColor: "white", border: "1px solid rgba(26,138,138,0.15)", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}
              >
                <summary
                  className="cursor-pointer font-semibold text-gray-900 select-none"
                  style={{ listStyle: "none" }}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span>{f.q}</span>
                    <span className="text-lg flex-shrink-0" style={{ color: TEAL }}>+</span>
                  </span>
                </summary>
                <div className="mt-3 text-sm text-gray-600 leading-relaxed border-t pt-3"
                  style={{ borderColor: "rgba(26,138,138,0.1)" }}>
                  {f.a}
                </div>
              </details>
            ))}
          </div>
        </div>

        {/* ── BOTTOM CTA ── */}
        <div
          className="rounded-3xl p-8 md:p-14 mb-10 text-center"
          style={{
            background: `linear-gradient(135deg, ${TEAL} 0%, ${TEAL_DARK} 100%)`,
            boxShadow: "0 8px 40px rgba(26,138,138,0.3)"
          }}
        >
          <div className="flex justify-center mb-5">
            <div className="rounded-2xl overflow-hidden shadow-lg" style={{ width: 64, height: 64 }}>
              <Image src="/logo.png" alt="MathParenting" width={64} height={64} className="w-full h-full object-cover" />
            </div>
          </div>
          <h2
            className="text-2xl md:text-4xl font-bold text-white mb-4"
            style={{ fontFamily: "'DM Serif Display', serif" }}
          >
            One homework question tonight.
            <br />
            That is all it takes to start.
          </h2>
          <p className="text-white opacity-80 mb-8 mx-auto text-base md:text-lg" style={{ maxWidth: 480 }}>
            You do not need to prepare. Just bring the question your child is stuck on and MathParenting will walk you through the rest.
          </p>
          <Link
            href="/chat"
            className="inline-flex items-center justify-center rounded-2xl px-8 py-4 font-bold text-base transition-all hover:scale-105"
            style={{ backgroundColor: "white", color: TEAL_DARK, boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }}
          >
            Start with tonight's homework →
          </Link>
          <p className="mt-4 text-white opacity-60 text-sm">
            CAD 14.99 per month. Cancel anytime and keep access until the end of your billing period.
          </p>
        </div>

        <div className="pb-10 text-center text-xs text-gray-500">
          MathParenting is learning support, not a replacement for school instruction.
        </div>
      </div>
    </div>
  );
}
