// scripts/curriculumData.mjs
// K–12 curriculum outline (parent-focused). Public, read-only seeding data.
// You can expand any grade later without breaking the seeder.

export const CURRICULUM = [
  {
    slug: "k",
    name: "Kindergarten (K)",
    description:
      "Numbers, shapes, patterns, measurement, and play-based problem solving.",
    units: [
      {
        title: "Counting & Quantity",
        lessons: [
          "Counting 0–20",
          "Understanding Quantity and “How Many”",
          "Comparing Groups (More, Less, Equal)",
          "Introduction to Addition/Subtraction through Stories",
        ],
      },
      {
        title: "Shapes, Sorting & Patterns",
        lessons: [
          "Recognizing Shapes (Circle, Square, Triangle, Rectangle)",
          "Sorting & Classifying by Colour, Shape, Size",
          "Patterns: Repeating Sequences",
        ],
      },
      {
        title: "Measurement, Position & Time",
        lessons: [
          "Measurement: Length & Weight (Nonstandard Units)",
          "Position Words: Above, Below, Beside, Inside",
          "Time Concepts: Today, Yesterday, Tomorrow",
        ],
      },
      {
        title: "Everyday Math",
        lessons: [
          "Introduction to Coins & Money (Concept Only)",
          "Real-World Math through Play (Toys, Snacks, Blocks)",
        ],
      },
    ],
  },

  {
    slug: "1",
    name: "Grade 1",
    description: "Basic operations, place value, and early geometry.",
    units: [
      {
        title: "Number Sense",
        lessons: [
          "Numbers to 100; Skip Counting (2s, 5s, 10s)",
          "Place Value (Tens & Ones)",
          "Even & Odd Numbers",
        ],
      },
      {
        title: "Operations & Problems",
        lessons: [
          "Addition & Subtraction within 20",
          "Word Problems with Pictures",
          "Introduction to Multiplication Ideas (Groups of 2, 5, 10)",
        ],
      },
      {
        title: "Fractions & Measurement",
        lessons: [
          "Fractions: Halves & Quarters",
          "Measurement: Length, Weight, Capacity",
          "Time: Hour / Half-Hour",
        ],
      },
      {
        title: "Shapes, Graphs & Money",
        lessons: [
          "Shapes: 2D & 3D Recognition and Attributes",
          "Graphs: Tally Marks & Pictographs",
          "Patterns: Increasing & Decreasing",
          "Simple Money Math with Coins",
        ],
      },
    ],
  },

  {
    slug: "2",
    name: "Grade 2",
    description: "Fluency with 2-digit numbers and foundational multiplication.",
    units: [
      {
        title: "Number & Place Value",
        lessons: [
          "Numbers 0–1000; Place Value (Hundreds)",
          "Skip Counting by 2s, 3s, 4s, 5s, 10s",
          "Rounding (Intro)",
        ],
      },
      {
        title: "Operations & Foundations of × ÷",
        lessons: [
          "Addition & Subtraction (Two-Digit Numbers)",
          "Intro to Multiplication (Arrays, Equal Groups)",
          "Intro to Division (Sharing)",
        ],
      },
      {
        title: "Fractions, Measure & Money",
        lessons: [
          "Fractions (1/2, 1/3, 1/4) as Equal Parts",
          "Measurement: cm, m, g, kg, L; Time to 5 Minutes",
          "Money Problems up to $1 or $5",
        ],
      },
      {
        title: "Geometry, Data & Reasoning",
        lessons: [
          "Shapes & Symmetry; Polygons & Solids",
          "Area & Perimeter (Informal)",
          "Picture & Bar Graphs; Word Problems + Reasoning",
        ],
      },
    ],
  },

  {
    slug: "3",
    name: "Grade 3",
    description:
      "Mastery of multiplication & division, fractions, and geometry.",
    units: [
      {
        title: "Place Value & Operations",
        lessons: [
          "Place Value to 10 000",
          "Multiplication & Division Facts (to 10×10)",
          "Properties of Operations",
        ],
      },
      {
        title: "Fractions & Decimals",
        lessons: [
          "Fractions: Equivalent Fractions",
          "Fractions on Number Lines",
          "Intro to Decimals (Tenths)",
        ],
      },
      {
        title: "Measurement & Geometry",
        lessons: [
          "Area & Perimeter (Rectangles & Irregular)",
          "Geometry: Angles, Lines, Quadrilaterals",
          "Measurement: m, cm, L, g; Time to Minute",
        ],
      },
      {
        title: "Data, Patterns & Problems",
        lessons: [
          "Data: Bar & Line Graphs",
          "Pattern Rules & Relationships",
          "Problem Solving with Multiple Steps",
        ],
      },
    ],
  },

  {
    slug: "4",
    name: "Grade 4",
    description:
      "Multi-digit operations, fractions, and geometry foundations.",
    units: [
      {
        title: "Number & Operations",
        lessons: [
          "Place Value to 1 000 000",
          "Multi-Digit Multiplication & Long Division",
          "Rounding & Estimating",
        ],
      },
      {
        title: "Factors, Multiples & Fractions",
        lessons: [
          "Factors & Multiples; Primes & Composites",
          "Fractions: Add/Subtract (Same & Different Denominators)",
        ],
      },
      {
        title: "Decimals & Measurement",
        lessons: [
          "Decimals: Tenths & Hundredths",
          "Measurement Conversions",
          "Area, Perimeter & Volume of Rectangular Prisms",
        ],
      },
      {
        title: "Geometry, Data & Probability",
        lessons: [
          "Angles & Classification of Shapes",
          "Symmetry & Transformations (Flip, Slide, Turn)",
          "Graphing & Interpreting Data; Intro to Basic Probability",
        ],
      },
    ],
  },

  {
    slug: "5",
    name: "Grade 5",
    description: "Decimals, fractions, volume, and pre-algebraic thinking.",
    units: [
      {
        title: "Whole Numbers & Expressions",
        lessons: [
          "Whole Numbers to Millions",
          "Order of Operations (PEMDAS/BEDMAS)",
          "Powers of 10 and Exponents (Intro)",
        ],
      },
      {
        title: "Fractions & Decimals",
        lessons: [
          "Fractions: Add, Subtract, Multiply (× Whole Numbers)",
          "Decimals: Add, Subtract, Multiply",
          "Converting Fractions ↔ Decimals ↔ Percents",
        ],
      },
      {
        title: "Geometry & Measurement",
        lessons: [
          "Geometry: Triangles & Quadrilaterals Properties",
          "Volume & Surface Area (Rectangular Prisms)",
          "Coordinate Graphing (1st Quadrant)",
        ],
      },
      {
        title: "Data, Ratio & Probability",
        lessons: [
          "Data: Line Plots, Averages, Range",
          "Intro to Ratio & Rate",
          "Simple Probability & Predictions",
        ],
      },
    ],
  },

  {
    slug: "6",
    name: "Grade 6",
    description: "Ratios, integers, decimals, and early algebra.",
    units: [
      {
        title: "Numbers & Operations",
        lessons: [
          "Integers & Number Lines",
          "Fractions: Divide by Whole Numbers & Fractions",
          "Decimals: All Operations",
        ],
      },
      {
        title: "Ratios, Rates & Percents",
        lessons: ["Ratios & Rates", "Unit Rates", "Percent & Percentage Problems"],
      },
      {
        title: "Algebra & Coordinates",
        lessons: [
          "Expressions & Equations (One-Variable)",
          "Exponents & Powers",
          "Coordinate Plane (All 4 Quadrants)",
        ],
      },
      {
        title: "Geometry, Data & Probability",
        lessons: [
          "Area, Surface Area, Volume (Cylinders & Prisms — overview)",
          "Data & Statistics: Mean, Median, Mode, Range",
          "Probability of Compound Events",
        ],
      },
    ],
  },

  {
    slug: "7",
    name: "Grade 7",
    description:
      "Proportional reasoning, expressions, equations, geometry.",
    units: [
      {
        title: "Rational Numbers & Integers",
        lessons: [
          "Rational Numbers (± Fractions & Decimals)",
          "Operations with Integers",
          "Real-Life Signed Operations",
        ],
      },
      {
        title: "Proportions & Percents",
        lessons: [
          "Ratios & Proportions",
          "Percent (Discount, Tax, Tip)",
          "Rates in Real Life",
        ],
      },
      {
        title: "Algebra & Equations",
        lessons: [
          "Algebraic Expressions & Simplifying",
          "Solving Linear Equations & Inequalities",
          "Introduction to Functions (Tables & Graphs)",
        ],
      },
      {
        title: "Geometry, Data & Probability",
        lessons: [
          "Geometry: Angles, Triangles, Similar Figures",
          "Area, Surface Area, Volume (Cylinders, Pyramids)",
          "Circles: Area & Circumference",
          "Data: Scatter Plots & Correlation",
          "Probability: Theoretical vs Experimental",
        ],
      },
    ],
  },

  {
    slug: "8",
    name: "Grade 8",
    description:
      "Algebra foundations, geometry, Pythagoras, and real numbers.",
    units: [
      {
        title: "Real Numbers & Exponents",
        lessons: [
          "Real Numbers: Rational & Irrational",
          "Exponents, Powers, Scientific Notation",
          "Roots & Radicals",
        ],
      },
      {
        title: "Linear Algebra",
        lessons: [
          "Linear Equations & Systems of Equations",
          "Graphing Lines (Slope-Intercept Form)",
          "Functions: Definition & Evaluation",
        ],
      },
      {
        title: "Polynomials & Geometry",
        lessons: [
          "Polynomials (Intro to Addition & Multiplication)",
          "Pythagorean Theorem & Applications",
          "Transformations & Similarity",
        ],
      },
      {
        title: "Measurement, Data & Probability",
        lessons: [
          "Volume & Surface Area (Cylinders, Cones, Spheres)",
          "Statistics: Bivariate Data & Line of Best Fit",
          "Probability of Compound Events",
          "Real-World Modeling & Algebra Connections",
        ],
      },
    ],
  },

  // High School tracks (Grade 9–12)
  {
    slug: "9",
    name: "Grade 9 — Algebra I Focus",
    description: "Algebra I topics commonly taught in Grade 9.",
    units: [
      {
        title: "Foundations",
        lessons: [
          "Real Number Properties",
          "Expressions, Equations, Inequalities",
          "Absolute Value",
        ],
      },
      {
        title: "Linear Relationships",
        lessons: [
          "Solving Linear Equations",
          "Graphing Linear Functions",
          "Function Notation & Transformations",
        ],
      },
      {
        title: "Quadratics & Factoring (Intro)",
        lessons: [
          "Solving Quadratic Equations (Intro)",
          "Factoring Techniques (Intro)",
          "Word Problems & Modeling",
        ],
      },
      {
        title: "Rationals & Radicals (Intro)",
        lessons: ["Rational Expressions (Intro)", "Radical Expressions (Intro)"],
      },
    ],
  },

  {
    slug: "10",
    name: "Grade 10 — Geometry Focus",
    description: "Geometry topics commonly taught in Grade 10.",
    units: [
      {
        title: "Logic & Proof",
        lessons: ["Logic & Proofs", "Points, Lines, Angles", "Parallel & Perpendicular"],
      },
      {
        title: "Congruence & Similarity",
        lessons: ["Congruent & Similar Triangles", "Polygons & Quadrilaterals"],
      },
      {
        title: "Circles & Coordinates",
        lessons: ["Circles: Arcs, Tangents, Chords", "Coordinate Geometry"],
      },
      {
        title: "Measurement & Trig",
        lessons: [
          "Perimeter, Area, Surface Area, Volume",
          "Right Triangle Trigonometry",
          "Transformations & Symmetry",
        ],
      },
    ],
  },

  {
    slug: "11",
    name: "Grade 11 — Algebra II Focus",
    description: "Algebra II topics commonly taught in Grade 11.",
    units: [
      {
        title: "Quadratics & Complex",
        lessons: [
          "Quadratic Functions & Complex Numbers",
          "Polynomial Functions & Factoring",
        ],
      },
      {
        title: "Rational, Exponential & Log",
        lessons: [
          "Rational Functions & Asymptotes",
          "Exponential & Logarithmic Functions",
        ],
      },
      {
        title: "Sequences, Series & Systems",
        lessons: [
          "Sequences & Series",
          "Systems of Non-Linear Equations",
          "Conic Sections",
        ],
      },
      {
        title: "Probability & Statistics (Basics)",
        lessons: ["Probability & Statistics Basics"],
      },
    ],
  },

  {
    slug: "12",
    name: "Grade 12 — Pre-Calc & Calculus Focus",
    description: "Pre-Calculus, Calculus, Statistics, and senior electives.",
    units: [
      {
        title: "Pre-Calculus",
        lessons: [
          "Functions (Review & Composition)",
          "Trigonometry: Unit Circle, Identities, Graphing",
          "Exponential, Logarithmic, Polynomial, Rational Functions",
          "Limits & Continuity (Intro)",
          "Sequences & Series (Arithmetic, Geometric)",
          "Vectors & Parametric Equations",
          "Polar Coordinates (Optional)",
        ],
      },
      {
        title: "Calculus (AP/Advanced)",
        lessons: [
          "Limits & Continuity",
          "Derivatives & Differentiation Rules",
          "Applications of Derivatives (Slope, Optimization)",
          "Integrals & Area Under a Curve",
          "Fundamental Theorem of Calculus",
          "Differential Equations (Intro)",
          "Real-World Applications (Physics, Economics, Motion)",
        ],
      },
      {
        title: "Statistics & Data",
        lessons: [
          "Descriptive Statistics (Mean, SD, Variance)",
          "Probability Rules (Independent, Conditional)",
          "Distributions (Binomial, Normal)",
          "Correlation & Regression",
          "Hypothesis Testing & Confidence Intervals",
          "Sampling Methods & Bias",
        ],
      },
      {
        title: "Financial Math / Data Science (Electives)",
        lessons: [
          "Simple & Compound Interest",
          "Loans, Mortgages, Savings Plans",
          "Budgeting & Financial Literacy",
          "Data Visualization & Modeling",
          "Spreadsheets & Statistical Software Basics",
        ],
      },
    ],
  },
];
