// src/app/page.tsx
import Link from "next/link";
import Image from "next/image";

const FEATURES = [
  {
    title: "Parent friendly teaching plan",
    desc: "You get a clear plan for what to do first, what to say next, and when to pause so your child can think.",
    icon: "🧠",
  },
  {
    title: "Built for calm not pressure",
    desc: "Mistakes are normal. The flow helps you stay patient and keep your child confident.",
    icon: "🤝",
  },
  {
    title: "Real examples you can do at home",
    desc: "Simple household connections that make math feel real, not random.",
    icon: "🏠",
  },
];

const HOW = [
  {
    title: "Bring a problem",
    desc: "Type a question or share a photo of homework.",
    icon: "📝",
  },
  {
    title: "Teach step by step",
    desc: "Follow the guided steps with built in pause points for your child.",
    icon: "👨‍👩‍👧",
  },
  {
    title: "Practice together",
    desc: "Get short practice to confirm your child truly understands.",
    icon: "🧩",
  },
];

const PARENT_WINS = [
  {
    title: "You stop guessing what to say",
    desc: "You get confident language that sounds like a real parent, not a textbook.",
    icon: "🗣️",
  },
  {
    title: "Less arguing during homework",
    desc: "A calmer structure that reduces tension and keeps the session moving.",
    icon: "🧘",
  },
  {
    title: "Your child builds real understanding",
    desc: "The focus is on thinking, not copying answers.",
    icon: "🌱",
  },
  {
    title: "You become the steady guide",
    desc: "Even if math was hard for you, you can still lead your child well.",
    icon: "⭐",
  },
];

const FAQ = [
  {
    q: "Do I need to be good at math",
    a: "No. MathParenting gives you the structure and the reasoning so you can guide your child step by step.",
  },
  {
    q: "Will this just give answers",
    a: "No. It is designed to help your child think. You get pause points, questions to ask, and common mistakes to watch for.",
  },
  {
    q: "What grades does it support",
    a: "It works across K to 12 topics. Start with whatever your child is learning right now.",
  },
  {
    q: "Can I use it with homework photos",
    a: "Yes. You can upload a photo and choose which question you want to work on.",
  },
];

function SectionTitle({ eyebrow, title, desc }: { eyebrow?: string; title: string; desc?: string }) {
  return (
    <div className="text-center">
      {!!eyebrow && <div className="text-sm font-semibold text-blue-700">{eyebrow}</div>}
      <h2 className="mt-2 text-2xl font-extrabold text-gray-900 md:text-3xl">{title}</h2>
      {!!desc && <p className="mx-auto mt-3 max-w-2xl text-sm text-gray-600 md:text-base">{desc}</p>}
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="relative">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 md:py-14">
        {/* Hero */}
        <div className="grid gap-10 md:grid-cols-2 md:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-sm text-gray-700 shadow-sm">
              <span className="text-base">⭐</span>
              <span>Where Parents Become Math Mentors</span>
            </div>

            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-gray-900 md:text-5xl">
              Turn homework time into calm teaching time
            </h1>

            <p className="mt-4 text-base text-gray-600 md:text-lg">
              MathParenting helps you guide your child with clear steps, gentle questions, and a simple plan that reduces
              stress and builds real understanding.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/chat"
                className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow hover:bg-blue-700"
              >
                Start a lesson
              </Link>

              <a
                href="#why"
                className="inline-flex items-center justify-center rounded-xl border bg-white px-5 py-3 font-semibold text-gray-800 shadow-sm hover:bg-gray-50"
              >
                Why parents love it
              </a>
            </div>

            <div className="mt-6 rounded-2xl border bg-white p-4 shadow-sm">
              <div className="text-sm font-semibold text-gray-900">What you will get each time</div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
                <li>A quick plan for the parent</li>
                <li>Step by step guidance with pause points</li>
                <li>Two short practice questions to confirm learning</li>
                <li>Common mistakes and how to fix them calmly</li>
              </ul>
            </div>
          </div>

          <div className="relative">
            <div className="rounded-3xl border bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 overflow-hidden rounded-2xl border bg-white">
                  <Image src="/logo.png" alt="MathParenting" width={48} height={48} className="h-full w-full object-cover" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">Designed for Parents</div>
                  <div className="text-xs text-gray-600">Short sessions. Clear structure. Less stress.</div>
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                {FEATURES.map((f) => (
                  <div key={f.title} className="rounded-2xl border bg-slate-50 p-4">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">{f.icon}</div>
                      <div>
                        <div className="text-sm font-bold text-gray-900">{f.title}</div>
                        <div className="mt-1 text-sm text-gray-700">{f.desc}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-2xl bg-blue-50 p-4">
                <div className="text-sm font-semibold text-gray-900">A simple promise</div>
                <p className="mt-1 text-sm text-gray-700">
                  You will not feel stuck. Your child will not feel judged. You will both know what to do next.
                </p>
              </div>
            </div>

            <div className="pointer-events-none absolute -right-6 -top-6 hidden h-24 w-24 rounded-3xl bg-blue-200 blur-2xl md:block" />
            <div className="pointer-events-none absolute -bottom-8 -left-8 hidden h-28 w-28 rounded-3xl bg-sky-200 blur-2xl md:block" />
          </div>
        </div>

        {/* Why */}
        <div id="why" className="mt-14">
          <SectionTitle
            eyebrow="Why it works"
            title="Parents want confidence and kids want safety"
            desc="MathParenting is built to help you lead the session calmly while your child does the thinking."
          />

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {PARENT_WINS.map((w) => (
              <div key={w.title} className="rounded-2xl border bg-white p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">{w.icon}</div>
                  <div>
                    <div className="text-base font-bold text-gray-900">{w.title}</div>
                    <div className="mt-1 text-sm text-gray-600">{w.desc}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* How */}
        <div id="how" className="mt-14 rounded-3xl border bg-white p-6 shadow-sm md:p-8">
          <SectionTitle
            eyebrow="How it works"
            title="A simple flow that reduces stress"
            desc="Bring the problem. Follow the steps. Practice together."
          />

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {HOW.map((h) => (
              <div key={h.title} className="rounded-2xl border bg-slate-50 p-5">
                <div className="text-2xl">{h.icon}</div>
                <div className="mt-2 text-base font-bold text-gray-900">{h.title}</div>
                <div className="mt-1 text-sm text-gray-700">{h.desc}</div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-gray-600">
              Start with the exact topic your child is learning this week.
            </div>
            <Link
              href="/chat"
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow hover:bg-blue-700"
            >
              Open chat
            </Link>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-14">
          <SectionTitle
            eyebrow="FAQ"
            title="Quick answers parents care about"
            desc="If you are wondering it, most parents are too."
          />

          <div className="mt-8 grid gap-3">
            {FAQ.map((f) => (
              <details key={f.q} className="rounded-2xl border bg-white p-4 shadow-sm">
                <summary className="cursor-pointer font-semibold text-gray-900">{f.q}</summary>
                <div className="mt-2 text-sm text-gray-700">{f.a}</div>
              </details>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-14 rounded-3xl border bg-white p-6 text-center shadow-sm md:p-10">
          <div className="text-sm font-semibold text-blue-700">Start small</div>
          <div className="mt-2 text-2xl font-extrabold text-gray-900 md:text-3xl">
            One problem today is enough
          </div>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-gray-600 md:text-base">
            Bring one question and let MathParenting guide you into a calmer, clearer teaching moment.
          </p>
          <div className="mt-6">
            <Link
              href="/chat"
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow hover:bg-blue-700"
            >
              Start a lesson
            </Link>
          </div>
        </div>

        <div className="mt-10 text-center text-xs text-gray-500">
          MathParenting is learning support, not a replacement for school instruction.
        </div>
      </div>
    </div>
  );
}