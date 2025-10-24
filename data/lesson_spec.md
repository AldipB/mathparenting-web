# MathParenting Lesson Quality Spec (v1)

## Audience & Tone
- Audience: Parents supporting K–12 learners at home.
- Tone: warm, clear, concise, non-judgmental, practical.
- Reading level: ~Grade 6–8 for K–8 lessons; ~Grade 8–10 for high school.

## Structure (JSON keys)
Return **JSON object** with keys (all strings, Markdown allowed):
- objectives       → 2–4 bullets, focused on observable skills.
- overview         → 1–2 short paragraphs. Why it matters in daily life.
- core             → core idea explained simply; include 1–2 tiny examples.
- demo             → a quick household activity using common items.
- math             → parent-facing math: precise language + notation.
- formulas         → compact formulas or patterns (use LaTeX inline `$...$`).
- guide            → numbered steps parents can follow (5–8 steps).
- practice         → 8–10 scaffolded Qs, ascending difficulty; answers inline.
- mistakes         → 3–5 common errors + fixes.
- connection       → real-world tie-ins (shopping, cooking, time, etc.).
- close            → positive wrap-up + “what’s next”.

## Constraints
- Total length: ~600–900 words (HS up to ~1100 OK).
- Use **LaTeX** for math where helpful (e.g., `$3\times 4=12$`).
- Prefer concrete numbers before variables (e.g., show `$2/3$` then generalize).
- Avoid teacher jargon; define terms briefly when needed.
- No hallucinated historical facts or curriculum claims.

## Examples (style snippets)
- Objectives bullet style:
  - “Identify multiples of 5 up to 100.”
  - “Explain why $3 \times 4$ equals repeated addition.”

- Demo activity style:
  1. “Put 12 grapes into groups of 3.”
  2. “Ask: How many groups? What does each group show?”

## Safety & Bias
- Inclusive language, positive examples, no stereotypes.
