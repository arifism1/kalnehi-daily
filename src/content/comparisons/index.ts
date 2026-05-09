export interface ComparisonRow {
  feature: string;
  kalnehi: "yes" | "no" | "partial" | string;
  competitor: "yes" | "no" | "partial" | string;
  /** Shown under the feature label (scope nuance for both products). */
  note?: string;
}

export interface ComparisonData {
  slug: string;
  competitorName: string;
  headline: string;
  subheadline: string;
  intro: string;
  rows: ComparisonRow[];
  whyKalnehi: string[];
  limitations: string;
  faqs: { q: string; a: string }[];
  relatedExams: string[];
}

const notion: ComparisonData = {
  slug: "notion",
  competitorName: "Notion",
  headline: "Kalnehi Daily vs Notion for Exam Preparation",
  subheadline: "Notion is a powerful general-purpose tool. Kalnehi Daily is built specifically for competitive exam aspirants who need to win every day.",
  intro: "Thousands of students have tried to turn Notion into a study planner. Most spend more time designing their system than actually studying. Kalnehi Daily is purpose-built for the exam preparation workflow — from syllabus tracking to Mastermind voice commands. Here's an honest comparison.",
  rows: [
    { feature: "Built for competitive exams", kalnehi: "yes", competitor: "no" },
    { feature: "Mastermind for exam queries", kalnehi: "yes", competitor: "no" },
    { feature: "Voice-controlled planning", kalnehi: "yes", competitor: "no" },
    { feature: "Syllabus tracker (JEE/NEET/UPSC pre-loaded)", kalnehi: "yes", competitor: "no" },
    { feature: "Revision Tracker & due list", kalnehi: "yes", competitor: "no" },
    { feature: "Daily study log with streak tracking", kalnehi: "yes", competitor: "partial" },
    { feature: "Marks and performance analytics", kalnehi: "yes", competitor: "no" },
    { feature: "Study timer (Pomodoro + deep work)", kalnehi: "yes", competitor: "partial" },
    { feature: "On-camera accountability mode", kalnehi: "yes", competitor: "no" },
    { feature: "Custom databases and pages", kalnehi: "no", competitor: "yes" },
    { feature: "General note-taking", kalnehi: "partial", competitor: "yes" },
    { feature: "Team collaboration", kalnehi: "partial", competitor: "yes" },
    { feature: "No setup required to start studying", kalnehi: "yes", competitor: "no" },
    { feature: "Works offline", kalnehi: "partial", competitor: "partial" },
    { feature: "Free / trial access", kalnehi: "7-day trial", competitor: "yes" },
  ],
  whyKalnehi: [
    "Notion requires you to build your study system from scratch — templates, databases, views, properties. Most students spend 3-4 hours just setting up, then maintain the setup instead of studying.",
    "Kalnehi Daily has the exam workflow built in. Your JEE/NEET/UPSC syllabus is already there. Revision Tracker keeps your next review dates in one place. Mastermind understands your syllabus context.",
    "Voice control in Kalnehi Daily means you can log study sessions, add doubts, and plan tomorrow's study without leaving your study mode. Notion's voice features are limited to dictation.",
    "Kalnehi Daily's Marks Engine tracks actual performance — mock scores, topic-wise accuracy, weak areas — and feeds that into your Mastermind recommendations. Notion has no concept of this.",
  ],
  limitations: "Kalnehi Daily is not a replacement for Notion if you need general note-taking, project management for a team, or a custom database solution. If you use Notion for things beyond exam preparation, you can use both — Kalnehi Daily for your daily study system, Notion for everything else.",
  faqs: [
    { q: "Can I use Kalnehi Daily if I already use Notion?", a: "Yes. Many students use Kalnehi Daily for their daily exam prep workflow and keep Notion for general notes or college work. They serve different purposes." },
    { q: "Does Kalnehi Daily have note-taking like Notion?", a: "Kalnehi Daily has a Doubt Tracker and Daily Log for capturing study notes and questions. It's optimised for exam prep, not general note-taking. For in-depth subject notes, a dedicated tool works better." },
    { q: "Is Notion's free plan enough for exam prep?", a: "Notion's free plan has no AI features and limited views. Setting up a study system from scratch takes significant time. Kalnehi Daily's free trial gives you a complete, ready-to-use study system on day one." },
    { q: "How long does it take to set up Kalnehi Daily vs Notion?", a: "Kalnehi Daily: under 5 minutes — pick your exam, and your syllabus and planner are ready. Notion: depends entirely on how much you customise. Most aspirants spend days iterating before they have a functional system." },
  ],
  relatedExams: ["jee", "neet", "upsc", "cat"],
};

const googleCalendar: ComparisonData = {
  slug: "google-calendar",
  competitorName: "Google Calendar",
  headline: "Kalnehi Daily vs Google Calendar for Study Planning",
  subheadline: "Google Calendar schedules events. Kalnehi Daily builds a complete study operating system around your exam.",
  intro: "Google Calendar is excellent for managing appointments, meetings, and fixed schedules. It is not designed for the complexity of competitive exam preparation — tracking syllabus progress, scheduling spaced revision, monitoring performance, or getting AI help with your preparation. Here's a direct comparison.",
  rows: [
    { feature: "Daily study planner", kalnehi: "yes", competitor: "yes" },
    { feature: "Syllabus tracking", kalnehi: "yes", competitor: "no" },
    { feature: "Mastermind assistance", kalnehi: "yes", competitor: "no" },
    { feature: "Revision Tracker (due dates)", kalnehi: "yes", competitor: "no" },
    { feature: "Mock test performance tracking", kalnehi: "yes", competitor: "no" },
    { feature: "Study streak / consistency tracking", kalnehi: "yes", competitor: "no" },
    { feature: "Voice-controlled study logging", kalnehi: "yes", competitor: "no" },
    { feature: "Doubt tracking", kalnehi: "yes", competitor: "no" },
    { feature: "On-camera accountability", kalnehi: "yes", competitor: "no" },
    { feature: "Exam-specific templates", kalnehi: "yes", competitor: "no" },
    { feature: "Shared calendars / invites", kalnehi: "no", competitor: "yes" },
    { feature: "Integrates with Gmail / Meet", kalnehi: "no", competitor: "yes" },
    { feature: "Free", kalnehi: "partial", competitor: "yes" },
  ],
  whyKalnehi: [
    "Google Calendar can tell you when to study. It cannot tell you what to study, whether you've covered enough, or how to improve your mock test score. Kalnehi Daily does all three.",
    "Revision scheduling in Google Calendar is manual — you have to create repeat events for every topic. Kalnehi Daily's Revision Tracker gives you a single due list with dates you control, next to your syllabus and daily plan.",
    "Mastermind in Kalnehi Daily understands your entire preparation — syllabus coverage, weak subjects, remaining time — and gives advice that Google Calendar never could.",
    "Consistency tracking in Kalnehi Daily shows actual study hours logged, not just meetings scheduled. Most students over-schedule and under-study. Kalnehi Daily shows the truth.",
  ],
  limitations: "If your primary need is scheduling fixed coaching classes, online classes, and fixed commitments into a calendar view, Google Calendar does this better. Kalnehi Daily focuses on the planning and tracking around what happens between those fixed commitments.",
  faqs: [
    { q: "Can I sync Kalnehi Daily with Google Calendar?", a: "This is on our roadmap. Currently, Kalnehi Daily and Google Calendar work independently. Many students use Google Calendar for fixed commitments (coaching, school) and Kalnehi Daily for their self-study system." },
    { q: "Why not just use Google Calendar for timetables?", a: "A timetable tells you when to study. A study operating system tells you what to study, tracks your progress, adapts to your performance, and helps you revise at the right time. They're different tools." },
    { q: "Is Kalnehi Daily free like Google Calendar?", a: "Kalnehi Daily has a 7-day free trial. After that, it's a paid subscription. Google Calendar is free but does not replace a purpose-built study system." },
  ],
  relatedExams: ["jee", "neet", "upsc", "gate", "cat"],
};

const physicalTimetable: ComparisonData = {
  slug: "physical-timetable",
  competitorName: "Physical Timetable",
  headline: "Kalnehi Daily vs Physical Timetable for Exam Prep",
  subheadline: "A timetable is a plan. Kalnehi Daily is a system that executes, adapts, and keeps you honest.",
  intro: "Every aspirant starts with a physical timetable. Most abandon it within two weeks — not because they're lazy, but because a static timetable cannot adapt to reality. Missed sessions pile up. Revision gets ignored. Weak areas don't get more time automatically. Kalnehi Daily solves the execution problem, not just the planning problem.",
  rows: [
    { feature: "Creates a daily study plan", kalnehi: "yes", competitor: "yes" },
    { feature: "Adapts when you miss a session", kalnehi: "yes", competitor: "no" },
    { feature: "Tracks actual hours studied", kalnehi: "yes", competitor: "no" },
    { feature: "Revision Tracker & due dates", kalnehi: "yes", competitor: "no" },
    { feature: "AI guidance on weak areas", kalnehi: "yes", competitor: "no" },
    { feature: "Exam performance analytics", kalnehi: "yes", competitor: "no" },
    { feature: "Doubt tracking", kalnehi: "yes", competitor: "no" },
    { feature: "Works without internet", kalnehi: "partial", competitor: "yes" },
    { feature: "Zero cost", kalnehi: "partial", competitor: "yes" },
    { feature: "Requires no device", kalnehi: "no", competitor: "yes" },
  ],
  whyKalnehi: [
    "A physical timetable doesn't know you missed three sessions last week. Kalnehi Daily does — and it adjusts your plan accordingly, prioritizing what's most urgent.",
    "Spaced revision across 100+ topics needs a system, not memory. Kalnehi Daily's Revision Tracker keeps every topic's next due date in one sortable list.",
    "Mastermind in Kalnehi Daily can tell you 'you've studied Physics for 40 hours but only 12 of Inorganic Chemistry — shift focus now.' No timetable can do this.",
    "The Consistency Tracker shows you real data: actual hours studied, topics covered, revision done. A timetable shows you what you planned. The gap between those two numbers is what determines your result.",
  ],
  limitations: "Physical timetables work well for students who want zero screen time, study in locations without connectivity, or prefer handwritten planning as a ritual. Many Kalnehi Daily users also keep a paper notepad for detailed day-level planning while using Kalnehi Daily for tracking and AI guidance.",
  faqs: [
    { q: "I'm used to paper planning. Will Kalnehi Daily disrupt my workflow?", a: "Kalnehi Daily is designed to add to your workflow, not replace it. You can continue detailed session planning on paper and use Kalnehi Daily for syllabus tracking, revision scheduling, and performance analytics — the parts paper cannot do." },
    { q: "What's the biggest problem with physical timetables?", a: "Rigidity. Life doesn't follow your timetable. When you miss sessions, the plan breaks down and most students restart repeatedly. Kalnehi Daily adapts in real time — what you miss today gets intelligently rescheduled." },
    { q: "Do toppers use physical timetables or apps?", a: "Many toppers use both. The pattern is: app for tracking and analytics (what's happening), paper/timetable for detailed daily micro-planning (what am I doing next hour). Kalnehi Daily is designed for the former." },
  ],
  relatedExams: ["jee", "neet", "upsc", "ca-intermediate"],
};

const excelStudyPlanner: ComparisonData = {
  slug: "excel-study-planner",
  competitorName: "Excel / Google Sheets Study Planner",
  headline: "Kalnehi Daily vs Excel Study Planner for Exam Prep",
  subheadline: "Excel gives you rows and columns. Kalnehi Daily gives you a preparation system designed for the way exams actually work.",
  intro: "Excel and Google Sheets study planners are popular because they're flexible — you can build anything. The problem is that 'anything' takes time to build, maintain, and improve. Most aspirants spend hours on spreadsheet design instead of studying. And spreadsheets cannot give you AI advice, a ready-made revision due list tied to your syllabus, or understand your exam context out of the box. Here's the honest comparison.",
  rows: [
    { feature: "Tracks syllabus coverage", kalnehi: "yes", competitor: "partial" },
    { feature: "Revision Tracker tied to syllabus", kalnehi: "yes", competitor: "no" },
    { feature: "Mastermind for exam advice", kalnehi: "yes", competitor: "no" },
    { feature: "Voice control", kalnehi: "yes", competitor: "no" },
    { feature: "Performance analytics and charts", kalnehi: "yes", competitor: "partial" },
    { feature: "Study streak and habit tracking", kalnehi: "yes", competitor: "partial" },
    { feature: "On-camera accountability mode", kalnehi: "yes", competitor: "no" },
    { feature: "Doubt tracker", kalnehi: "yes", competitor: "partial" },
    { feature: "Exam-specific data pre-loaded", kalnehi: "yes", competitor: "no" },
    { feature: "Fully customizable rows/columns", kalnehi: "no", competitor: "yes" },
    { feature: "Formula-based calculations", kalnehi: "no", competitor: "yes" },
    { feature: "Shareable with a link", kalnehi: "partial", competitor: "yes" },
    { feature: "Works offline", kalnehi: "partial", competitor: "yes" },
    { feature: "Free", kalnehi: "partial", competitor: "yes" },
  ],
  whyKalnehi: [
    "Setting up a comprehensive study tracking spreadsheet takes 2-4 hours. Maintaining it takes another 30-60 minutes weekly. Kalnehi Daily requires no setup — pick your exam and start.",
    "No spreadsheet can say 'You've been avoiding Organic Chemistry for two weeks — let's address that today.' Mastermind can, because it understands your full preparation context.",
    "Revision scheduling in a spreadsheet is either manual or requires complex formulas. Kalnehi Daily's Revision Tracker gives you a first-class due list without building a grid yourself.",
    "Data quality in spreadsheets degrades when motivation drops — you stop logging. Kalnehi Daily's daily log is quick enough (voice or 2-3 taps) that students actually maintain it through difficult periods.",
  ],
  limitations: "If you need highly customized tracking that doesn't fit standard exam workflows — unusual metrics, custom formulas, data export for analysis — a spreadsheet gives you more control. Some serious aspirants use Kalnehi Daily for the operational layer and export data to sheets for deeper analysis.",
  faqs: [
    { q: "Can I export my Kalnehi Daily data to a spreadsheet?", a: "Yes — study log data and performance metrics can be exported. Some students use Kalnehi Daily for daily tracking and pull data into sheets monthly for trend analysis." },
    { q: "I've built a good spreadsheet system. Why switch?", a: "If your current system is working, you don't have to. Kalnehi Daily is for aspirants whose spreadsheet system is either too complex to maintain, lacks AI guidance, or keeps breaking down when life gets difficult." },
    { q: "Are there good free spreadsheet templates for exam prep?", a: "Many exist — for JEE, NEET, and UPSC in particular. They work to varying degrees. The structural limitation is that a spreadsheet doesn't know your progress or give you intelligent advice based on it." },
  ],
  relatedExams: ["jee", "neet", "upsc", "gate"],
};

const todoist: ComparisonData = {
  slug: "todoist",
  competitorName: "Todoist",
  headline: "Kalnehi Daily vs Todoist for Exam Preparation",
  subheadline: "Todoist manages your tasks. Kalnehi Daily manages your entire exam preparation — AI, syllabus, revision, performance, and habit — in one place.",
  intro: "Todoist is one of the best task management apps available. It's excellent for managing work projects, personal tasks, and GTD workflows. But exam preparation is not a task management problem — it's a learning system problem. Here's how they differ for competitive exam aspirants.",
  rows: [
    { feature: "Task / to-do management", kalnehi: "yes", competitor: "yes" },
    { feature: "Daily planning", kalnehi: "yes", competitor: "yes" },
    { feature: "Recurring tasks", kalnehi: "yes", competitor: "yes" },
    { feature: "Exam syllabus tracking", kalnehi: "yes", competitor: "no" },
    { feature: "Mastermind for exam advice", kalnehi: "yes", competitor: "no" },
    { feature: "Revision due-date queue", kalnehi: "yes", competitor: "no" },
    { feature: "Marks and performance tracking", kalnehi: "yes", competitor: "no" },
    { feature: "Study timer integration", kalnehi: "yes", competitor: "no" },
    { feature: "Voice study commands", kalnehi: "yes", competitor: "partial" },
    { feature: "On-camera accountability", kalnehi: "yes", competitor: "no" },
    { feature: "Cross-platform sync", kalnehi: "yes", competitor: "yes" },
    {
      feature: "Natural language task entry",
      kalnehi: "yes",
      competitor: "yes",
      note: "Kalnehi: plain-language typed quick-add on your daily plan (preview tasks before adding); Todoist: quick-add across projects and inbox.",
    },
    { feature: "Third-party integrations", kalnehi: "no", competitor: "yes" },
    { feature: "Free plan", kalnehi: "partial", competitor: "yes" },
  ],
  whyKalnehi: [
    "Todoist is great for listing what to study. It has no idea whether you're spending the right time on the right subjects given your exam date and current syllabus coverage.",
    "Mastermind in Kalnehi Daily understands your exam-specific context — JEE paper patterns, UPSC current affairs weight, NEET chapter-wise difficulty. Todoist's AI is a general task assistant.",
    "Spaced revision cannot be managed via recurring Todoist tasks alone — you'd need to manually create, track, and reschedule hundreds of tasks. Kalnehi Daily's Revision Tracker is built for that workload in one list.",
    "Study performance in Kalnehi Daily feeds back into your planning. If your mock scores show Physics is weak, Mastermind surfaces this. Todoist treats all tasks as equal — completing a topic and completing a major revision are both just 'tasks done'.",
  ],
  limitations: "If you need deep task management with project hierarchies, inbox capture, and third-party integrations (calendar, email, Slack), Todoist is more powerful. Many students use Todoist for general life tasks and Kalnehi Daily specifically for exam preparation.",
  faqs: [
    { q: "Can I use Kalnehi Daily alongside Todoist?", a: "Yes. Many students use Todoist for general task management and Kalnehi Daily as their dedicated exam preparation system. They're complementary, not competitive." },
    {
      q: "Can I add tasks in plain English without picking every field manually?",
      a: "Yes. On your daily plan, use typed quick-add: describe blocks in natural language and Kalnehi turns them into task previews you can edit before adding. Voice planning does something similar from speech. Todoist's natural-language quick-add is more ubiquitous across projects and devices — Kalnehi focuses parsing on exam-day planning.",
    },
    { q: "Does Kalnehi Daily have a task inbox like Todoist?", a: "Kalnehi Daily has a Doubt Tracker and Daily Log for capturing exam-related items quickly. For general inbox capture, Todoist or a simple notes app works better." },
    { q: "Why not just add exam prep to my Todoist projects?", a: "You can — many aspirants try this. The limitation is that Todoist can't adapt your study plan based on performance data, doesn't understand revision scheduling, and provides no AI guidance specific to competitive exams." },
  ],
  relatedExams: ["jee", "neet", "cat", "gate"],
};

export const COMPARISONS: ComparisonData[] = [
  notion,
  googleCalendar,
  physicalTimetable,
  excelStudyPlanner,
  todoist,
];

export function getAllComparisons(): ComparisonData[] {
  return COMPARISONS;
}

export function getComparisonBySlug(slug: string): ComparisonData | undefined {
  return COMPARISONS.find((c) => c.slug === slug);
}

export function getComparisonSlugs(): string[] {
  return COMPARISONS.map((c) => c.slug);
}
