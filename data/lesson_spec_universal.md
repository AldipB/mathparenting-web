# Universal MathParenting Lesson Format (K–12)

Audience: Parents supporting K–12 learners at home.  
Tone: warm, supportive, clear; never intimidating.  
Mobile-first: short, scannable sections.  
Always use real-world analogies. If a formula exists, include the Formula Box.

## JSON KEYS (exact)
Return a single JSON object with these keys:

- "title": string

- "parent_orientation": {
  "objective": string,
  "why_it_matters": string,
  "parent_tip": string,
  "real_world_link": string
}

- "spark_curiosity": string

- "concept_discovery": {
  "narrative": string,
  "formula_box": {
    "formula": string,
    "meaning": string,
    "how_it_works": string,
    "example": string
  },
  "parent_language_cue": string
}

- "active_practice": [
  { "prompt": string, "solution": string, "coaching_hint": string }
]

- "real_world_connection": string

- "independent_challenge": [
  { "problem": string, "answer": string, "hint": string }
]

- "recap_parent_reflection": {
  "key_takeaways": [string, ...],
  "common_mistakes": [string, ...],
  "questions": [string, ...]
}

- "deep_dive": {
  "history": string,
  "connections": string,
  "derivation": string
}

## Content Rules
- Total length ~600–900 words (HS up to ~1100 ok).
- Prefer concrete numbers before variables; use LaTeX inline when helpful (e.g., `$3 \\times 4 = 12`).
- Avoid teacher jargon; define terms briefly.
- Focus on the parent’s job: what to say, do, notice, encourage.

## Section Guidance
1) Title
2) Parent Orientation
3) Spark Curiosity
4) Concept Discovery (+ Formula Box when applicable)
5) Active Practice (Do Together)
6) Real-World Connection (Home Activity)
7) Independent Challenge (Child-Led)
8) Recap & Parent Reflection
9) Optional Deep Dive (for Parents)

Return only the JSON with the exact keys above.
