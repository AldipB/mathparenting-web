// scripts/appendChapters.mjs
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const db = createClient(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(),
  { auth: { persistSession: false } }
);

const K = "k";
const UNIT_TITLE = "Complete Chapter Index";

// Big, parent-recognizable chapter lists per grade.
// (You can edit/expand freely. Existing lessons won’t be duplicated.)
const CHAPTERS = {
  [K]: [
    "Counting 0–50",
    "Counting 0–100",
    "Compare Numbers to 10 (>, <, =)",
    "Make 10 (Compositions of 10)",
    "Add with Objects (Stories)",
    "Subtract with Objects (Stories)",
    "Read & Write Numbers (0–20)",
    "Number Bonds to 10",
    "2D Shapes (Circle, Triangle, Square, Rectangle)",
    "3D Shapes (Sphere, Cube, Cylinder, Cone)",
    "Sort & Classify (Shape, Size, Colour)",
    "Patterns (AB, AAB, ABB, ABC)",
    "Measure with Nonstandard Units",
    "Position Words (Above, Below, Beside, Inside, Next to)",
    "Time Words (Today, Yesterday, Tomorrow)",
    "Coins and Notes (Recognize, No Calculations)",
  ],
  1: [
    "Count to 120; Read & Write to 120",
    "Place Value: Tens & Ones",
    "Add within 20 (Strategies)",
    "Subtract within 20 (Strategies)",
    "Add/Subtract within 100 (No Regrouping)",
    "Even & Odd Numbers",
    "Equal Groups (Intro to Multiplication)",
    "Halves & Quarters (Fractions as Equal Shares)",
    "Tell Time to the Hour and Half-Hour",
    "Measure Length (Nonstandard → Centimetres)",
    "Picture Graphs & Tally Charts",
    "2D & 3D Shape Attributes",
    "Word Problems (Add/Subtract within 20)",
    "Skip Counting by 2s, 5s, 10s",
    "Simple Money Math with Coins",
  ],
  2: [
    "Place Value to 1000 (Hundreds, Tens, Ones)",
    "Add & Subtract within 100 (Regrouping)",
    "Add & Subtract within 1000 (Concepts)",
    "Fluency with 2-Digit Addition/Subtraction",
    "Intro to Multiplication (Arrays, Equal Groups)",
    "Intro to Division (Sharing, Grouping)",
    "Odd/Even Patterns",
    "Fractions: 1/2, 1/3, 1/4, 3/4 (Area & Set Models)",
    "Number Line to 1000",
    "Money Word Problems (Up to $5)",
    "Length (cm, m), Mass (g, kg), Capacity (L)",
    "Time to 5 Minutes",
    "Picture & Bar Graphs",
    "Area & Perimeter (Informal)",
  ],
  3: [
    "Place Value to 10,000",
    "Multiply Facts to 10×10",
    "Divide Facts to 100",
    "Properties (Commutative, Associative, Distributive)",
    "Two-Step Word Problems (×, ÷, +, −)",
    "Fractions: Unit Fractions; On Number Lines",
    "Equivalent Fractions",
    "Compare Fractions with Same Denominator or Numerator",
    "Intro to Decimals (Tenths)",
    "Area of Rectangles; Composite Figures",
    "Perimeter of Polygons",
    "Angles (Right, Acute, Obtuse); Quadrilaterals",
    "Time to the Minute; Elapsed Time",
    "Bar & Line Graphs",
    "Pattern Rules (Growing & Repeating)",
  ],
  4: [
    "Place Value to 1,000,000; Rounding",
    "Multi-Digit Addition & Subtraction",
    "Multi-Digit Multiplication (Up to 4×1, 2×2)",
    "Long Division (1-Digit Divisors)",
    "Factors, Multiples; Prime & Composite",
    "Fractions: Equivalence; Compare",
    "Add/Subtract Fractions (Same & Unlike Denominators)",
    "Mixed Numbers ↔ Improper Fractions",
    "Decimals (Tenths, Hundredths); Compare & Round",
    "Measurement Conversions (metric/US customary basics)",
    "Area & Perimeter; Intro to Volume",
    "Angles; Classify Triangles & Quadrilaterals",
    "Symmetry & Transformations",
    "Line Plots & Data",
    "Intro to Probability (Simple Events)",
  ],
  5: [
    "Powers of 10; Place Value to Millions",
    "Decimal Operations (Add/Subtract/Multiply/Divide by 10s)",
    "Fraction Addition & Subtraction (Unlike Denominators)",
    "Multiply Fractions by Whole Numbers",
    "Multiply Fraction × Fraction",
    "Divide Unit Fractions & Whole Numbers (Concepts)",
    "Decimals: Add/Subtract/Multiply",
    "Fractions ↔ Decimals ↔ Percents",
    "Order of Operations (PEMDAS)",
    "Volume of Rectangular Prisms; Surface Area (intro)",
    "Coordinate Plane (1st Quadrant)",
    "Triangles & Quadrilaterals Properties",
    "Line Plots; Mean/Median/Mode/Range (Intro)",
    "Rates & Ratios (Intro)",
    "Simple Probability & Predictions",
  ],
  6: [
    "Integers on Number Line; Absolute Value",
    "All Decimal Operations",
    "Fraction Division (÷ Fraction) & Word Problems",
    "Ratios, Rates & Unit Rates",
    "Percents (of, discounts, tax, tip)",
    "Expressions, Variables & Order of Operations",
    "One-Step Equations & Inequalities",
    "Exponents & Powers (Whole Number)",
    "Coordinate Plane (All Quadrants)",
    "Area (Triangles, Polygons) & Composite Figures",
    "Surface Area & Volume (Prisms; intro to Cylinders)",
    "Statistical Questions; Dot/Box Plots & Histograms",
    "Mean/Median/Mode/Range; MAD",
    "Compound Probability (Intro)",
  ],
  7: [
    "Operations with Rational Numbers (±×÷ Fractions/Decimals)",
    "Integer Operations (±×÷)",
    "Proportions & Percent Problems (Discount, Tax, Tip)",
    "Simple/Compound Interest (Intro)",
    "Algebraic Expressions: Combine Like Terms",
    "Solving Linear Equations & Inequalities (1-step, 2-step, multi-step)",
    "Geometry: Angle Relationships; Triangles",
    "Similar Figures & Scale Drawings",
    "Area/Surface Area/Volume (Cylinders, Pyramids)",
    "Circles: Circumference & Area",
    "Scatter Plots; Correlation",
    "Theoretical vs Experimental Probability",
  ],
  8: [
    "Real Numbers: Rational vs Irrational",
    "Exponent Rules; Scientific Notation",
    "Roots & Radicals; Simplify",
    "Linear Equations; Functions; Slope-Intercept",
    "Systems of Linear Equations (Graph/Substitution/Elimination)",
    "Functions: Evaluate & Compare",
    "Polynomials (Add/Subtract/Multiply binomials)",
    "Pythagorean Theorem & Distance",
    "Transformations; Similarity; Congruence",
    "Volume & Surface Area (Cylinders, Cones, Spheres)",
    "Bivariate Data & Line of Best Fit",
    "Compound Probability (Trees, Tables)",
  ],
  9: [
    "Linear Equations & Inequalities (All Methods)",
    "Functions & Graphs; Domain/Range",
    "Slope, Parallel/Perpendicular Lines",
    "Systems of Equations & Inequalities",
    "Quadratics: Forms, Graphing, Zeros",
    "Factoring (GCF, Trinomials, Special Products)",
    "Quadratic Solutions (Factoring, Formula, Completing Square)",
    "Exponential Functions (Intro)",
    "Radicals: Simplify & Operations",
    "Rational Expressions (Intro)",
    "Modeling & Word Problems",
  ],
  10: [
    "Logic & Proofs; Conjectures",
    "Points, Lines, Angles; Parallel & Perpendicular",
    "Congruence (Rigid Motions)",
    "Similarity (Dilations & Ratios)",
    "Right Triangle Trigonometry",
    "Polygons & Quadrilaterals",
    "Circles: Arcs, Chords, Tangents",
    "Coordinate Geometry (Distance, Midpoint, Partition)",
    "Area & Perimeter; Surface Area & Volume",
    "Transformations & Symmetry",
  ],
  11: [
    "Quadratic Functions (Vertex/Standard/Factored)",
    "Complex Numbers (i arithmetic)",
    "Polynomial Functions & Factoring",
    "Rational Functions & Asymptotes",
    "Exponential & Logarithmic Functions",
    "Sequences & Series (Arithmetic/Geometric)",
    "Systems (Non-Linear, 2-var/3-var)",
    "Conic Sections (Parabola, Ellipse, Hyperbola)",
    "Probability & Statistics (Combinations, Permutations)",
  ],
  12: [
    "Function Operations & Composition",
    "Trigonometry (Unit Circle, Identities, Graphs)",
    "Limits & Continuity (Intro)",
    "Derivatives: Rules & Applications",
    "Integrals: Area Under Curve; FTC",
    "Differential Equations (Intro)",
    "Statistics: Sampling, Inference (Intro)",
    "Financial Math: Simple/Compound Interest, Loans",
  ],
};

const kebab = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

async function getGradeId(slug) {
  const { data } = await db.from("grades").select("id").eq("slug", String(slug)).single();
  return data?.id;
}

async function getOrCreateUnit(grade_id, title, order_index = 99) {
  // Try to find existing by title
  const { data } = await db
    .from("units")
    .select("id")
    .eq("grade_id", grade_id)
    .eq("title", title)
    .maybeSingle();
  if (data?.id) return data.id;

  const { data: ins, error } = await db
    .from("units")
    .insert({ grade_id, title, order_index, overview: `${title} — auto index unit.` })
    .select("id")
    .single();
  if (error) throw error;
  return ins.id;
}

async function ensureLesson(unit_id, title, order_index) {
  const slug = kebab(title);
  const { data } = await db
    .from("lessons")
    .select("id")
    .eq("unit_id", unit_id)
    .eq("slug", slug)
    .maybeSingle();
  if (data?.id) return false; // already exists

  const { error } = await db
    .from("lessons")
    .insert({
      unit_id,
      order_index,
      slug,
      title,
      difficulty_level: "core",
      summary: `${title} — parent overview.`,
    });
  if (error) throw error;
  return true;
}

async function run() {
  console.log("Appending chapters...");
  for (const [gradeSlug, titles] of Object.entries(CHAPTERS)) {
    const grade_id = await getGradeId(gradeSlug);
    if (!grade_id) {
      console.log(`⚠️  Grade ${gradeSlug} not found; skipping`);
      continue;
    }
    const unit_id = await getOrCreateUnit(grade_id, UNIT_TITLE, 99);

    let added = 0;
    for (let i = 0; i < titles.length; i++) {
      const ok = await ensureLesson(unit_id, titles[i], i + 1);
      if (ok) added++;
    }
    console.log(`Grade ${gradeSlug}: added ${added} chapters`);
  }
  console.log("✅ Append complete.");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
