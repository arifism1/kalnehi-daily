import Link from "next/link";

interface Group {
  label: string;
  color: string;
  exams: string[];
}

const EXAM_GROUPS: Group[] = [
  {
    label: "Engineering & Tech",
    color: "#2563EB",
    exams: ["JEE Main", "JEE Advanced", "GATE"],
  },
  {
    label: "Medical Sciences",
    color: "#059669",
    exams: ["NEET UG", "NEET PG", "INI-CET"],
  },
  {
    label: "Management & Business",
    color: "#D97706",
    exams: ["CAT", "GMAT", "IPMAT Indore", "IPMAT Rohtak", "JIPMAT"],
  },
  {
    label: "Finance & Law",
    color: "#0369A1",
    exams: ["CA Foundation", "CA Intermediate", "CA Final", "CLAT UG"],
  },
  {
    label: "Civil & Defense Services",
    color: "#92400E",
    exams: ["UPSC CSE Prelims", "UPSC CSE Mains", "NDA"],
  },
  {
    label: "Banking & SSC",
    color: "#0F766E",
    exams: ["SSC CHSL", "SSC CGL", "IBPS PO", "SBI PO"],
  },
  {
    label: "Study Abroad & Foundation",
    color: "#7C3AED",
    exams: ["SAT", "GRE", "CBSE Class 12"],
  },
  {
    label: "Common University Entrance",
    color: "#BE185D",
    exams: ["CUET UG", "Other"],
  },
];

const UNIVERSAL_FEATURES = [
  "Daily plan & execution tracker",
  "Focus timer with real study minutes",
  "Marks engine & predictions (full weightage model for JEE, NEET UG & Boards)",
  "Revision engine (fullest when microtopic syllabus is loaded for your exam)",
  "Consistency heatmap & habit tracker",
  "Brain Yoga / meditation resets",
  "Mastermind AI coach",
  "Doubt tracker",
  "Daily log",
  "Push notifications & reminders",
];

export function ExamTabsSection() {
  return (
    <section className="bg-kal-page-end py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">

        {/* Header */}
        <div className="mb-14">
          <h2
            className="mb-4 text-3xl font-normal leading-tight tracking-tight text-kal-text sm:text-4xl lg:text-[2.75rem]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Built for every competitive exam.
          </h2>
          <p className="max-w-xl text-lg text-kal-text-secondary">
            27 exams in the catalog across 8 groups (including Other for exams not listed yet). You get the same daily execution stack for every pick. The deepest syllabus maps, marks prediction, and revision tied to microtopics are live today for JEE Main, NEET UG, and Class 11/12 Boards — more exams gain that depth as we ship data.
          </p>
        </div>

        {/* Exam groups grid */}
        <div className="mb-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {EXAM_GROUPS.map(({ label, color, exams }) => (
            <div
              key={label}
              className="overflow-hidden rounded-2xl border border-kal-border bg-kal-card backdrop-blur-sm"
            >
              {/* Group header */}
              <div
                className="px-4 py-3"
                style={{ backgroundColor: `${color}12`, borderBottom: `1px solid ${color}22` }}
              >
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color }}>
                  {label}
                </p>
              </div>

              {/* Exam rows */}
              <div className="divide-y divide-kal-border">
                {exams.map((name) => (
                  <div key={name} className="px-4 py-2.5">
                    <span className="text-sm font-medium text-kal-text">{name}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Universal features note */}
        <div className="overflow-hidden rounded-2xl border border-kal-border bg-kal-card p-8 backdrop-blur-sm">
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-kal-accent">
                One stack. Honest depth.
              </p>
              <h3
                className="mb-3 text-2xl font-normal leading-tight text-kal-text"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Planning, timer, habits, doubts, log, Brain Yoga & Mastermind — for every exam you choose.
              </h3>
              <p className="text-sm leading-relaxed text-kal-text-secondary">
                Marks and revision features are most powerful where we have full syllabus weighting and chapter data (today: JEE Main, NEET UG, Boards). For CAT, UPSC, CA, and the rest, you still run the same disciplined loop while we expand exam-specific graphs.
              </p>
              <Link
                href="/auth"
                className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-full bg-kal-accent px-7 text-sm font-bold text-white shadow-[0_4px_14px_rgba(255,122,0,0.28)] transition hover:brightness-105"
              >
                Start free — pick your exam
              </Link>
            </div>
            <div>
              <div className="grid grid-cols-1 gap-y-2 sm:grid-cols-2">
                {UNIVERSAL_FEATURES.map((f) => (
                  <div key={f} className="flex items-center gap-2.5">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-kal-accent/70" aria-hidden />
                    <span className="text-sm text-kal-text-secondary">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
