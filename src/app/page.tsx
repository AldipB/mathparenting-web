// src/app/page.tsx
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="mp-watermark mx-auto max-w-5xl">
      {/* HERO */}
      <section className="grid gap-8 md:grid-cols-[1.2fr,1fr] items-center py-10 md:py-14">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-gray-600 mb-3">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            Built to support parents who want to guide with confidence
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-gray-900">
            Make math easier to teach, one topic at a time
          </h1>
          <p className="mt-4 text-gray-600 md:text-lg">
            MathParenting helps you explain any topic or any question for K to 12.
            It speaks to you as a parent and gives clear and calm guidance so you can teach with confidence.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href="/chat"
              className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Open Chat
            </Link>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-4 rounded-3xl bg-blue-100/60 blur-2xl" aria-hidden />
          <div className="relative rounded-3xl border bg-white p-4 shadow-sm">
            <div className="rounded-2xl border bg-gray-50 p-4 text-sm text-gray-700">
              <p className="font-semibold">Example</p>
              <p className="mt-2">
                <span className="text-gray-500">Q:</span> How can I teach fractions
              </p>
              <p className="mt-2">
                <span className="text-gray-500">A:</span> Use something your child knows, like pizza or fruit.
                Say, If we cut this apple in two equal parts, each piece is
                <span className="font-mono"> 1⁄2</span>. If we cut it again, we get quarters,
                <span className="font-mono"> 1⁄4</span>.
              </p>
              <p className="mt-3 text-xs text-gray-500">
                Every answer includes short teaching steps, a home demo, and quick practice ideas.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-6 md:py-10">
        <h2 className="text-xl md:text-2xl font-bold">Why parents use MathParenting</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <Feature
            title="Parent first approach"
            desc="You get explanations written for you, so you know exactly what to say."
            emoji="👩‍👧"
          />
          <Feature
            title="Everyday examples"
            desc="We turn real objects like coins, cups, clocks, and recipes into simple lessons."
            emoji="🍎"
          />
          <Feature
            title="Quick and clear steps"
            desc="Each topic includes short steps, questions to ask, and simple home practice."
            emoji="🧮"
          />
        </div>
      </section>

      {/* HOW IT WORKS (kept, but only points to Chat) */}
      <section id="how" className="py-6 md:py-10">
        <h2 className="text-xl md:text-2xl font-bold">How it works</h2>
        <ol className="mt-4 grid gap-4 md:grid-cols-3">
          <Step n={1} title="Ask your question">
            Type any topic or any question for K to 12, for example percentages, area, or algebra basics.
          </Step>
          <Step n={2} title="Get your parent guide">
            You receive a teaching plan with plain language steps and home examples.
          </Step>
          <Step n={3} title="Teach with confidence">
            Follow the plan and adjust as your child learns. The chat helps you adapt in real time.
          </Step>
        </ol>
        <div className="mt-6">
          <Link
            href="/chat"
            className="inline-flex items-center rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow hover:bg-blue-700"
          >
            Start teaching now
          </Link>
        </div>
      </section>

      {/* CTA FOOTER */}
      <section className="py-10 md:py-14">
        <div className="rounded-3xl border bg-gradient-to-br from-blue-600 to-blue-700 p-6 text-white">
          <h3 className="text-2xl font-bold">Designed for parents</h3>
          <p className="mt-2 text-blue-100">
            Turn homework time into connection time. Use simple examples in your home and build confidence step by step.
          </p>
          <div className="mt-5">
            <Link
              href="/chat"
              className="inline-flex items-center rounded-xl bg-white px-5 py-3 font-semibold text-blue-700 shadow hover:bg-blue-50"
            >
              Open Chat
            </Link>
          </div>
          <p className="mt-3 text-xs text-blue-100">
            Works for any topic or any question in K to 12. No experience required.
          </p>
        </div>
      </section>
    </div>
  );
}

/* --- small components --- */
function Feature({ title, desc, emoji }: { title: string; desc: string; emoji: string }) {
  return (
    <div className="rounded-2xl border p-4">
      <div className="text-2xl">{emoji}</div>
      <h3 className="mt-2 font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-gray-600">{desc}</p>
    </div>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="rounded-2xl border p-4">
      <div className="flex items-center gap-3">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-blue-600 text-white text-sm">
          {n}
        </span>
        <h3 className="font-semibold">{title}</h3>
      </div>
      <p className="mt-2 text-sm text-gray-600">{children}</p>
    </li>
  );
}
