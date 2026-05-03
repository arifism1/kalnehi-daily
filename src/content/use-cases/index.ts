export interface DayInTheLife {
  time: string;
  activity: string;
  kalnehiRole?: string;
}

export interface UseCaseData {
  slug: string;
  audienceLabel: string;
  headline: string;
  subheadline: string;
  intro: string;
  challenges: string[];
  dayInTheLife: DayInTheLife[];
  features: { title: string; why: string }[];
  faqs: { q: string; a: string }[];
  relatedExams: string[];
  relatedFeatures: string[];
}

const jeeDroppers: UseCaseData = {
  slug: "jee-droppers",
  audienceLabel: "JEE Droppers",
  headline: "Kalnehi Daily for JEE Droppers: How to Use a Gap Year to Actually Improve",
  subheadline: "A drop year is not a second chance — it's a final one. The students who succeed in their drop year don't work harder than they did in Class 12. They work with a system.",
  intro: "Every year, around 2 lakh JEE aspirants choose to drop and attempt the exam again. Fewer than 10% of them improve their rank significantly. The reason isn't intelligence or effort — it's structure. Without the external discipline of school and coaching, most droppers drift through the year. Kalnehi Daily is built to provide the internal structure a drop year requires.",
  challenges: [
    "No external schedule — coaching class is optional or finished, school is gone",
    "Psychological weight of knowing this is the last attempt",
    "Isolation from peers who've moved to college",
    "Difficulty identifying what to fix without performance data",
    "Revision of Class 11 material while still covering Class 12 gaps",
  ],
  dayInTheLife: [
    { time: "6:00 AM", activity: "Wake up and log yesterday's target completion", kalnehiRole: "Daily Log — 30 seconds to record what you did vs what you planned" },
    { time: "6:30 AM", activity: "Mastermind morning briefing", kalnehiRole: "Ask Mastermind what to prioritize today based on your mock performance and coverage gaps" },
    { time: "7:00 – 10:00 AM", activity: "Physics session (deep work, no phone)", kalnehiRole: "Study Timer running. Voice-log doubts without breaking focus" },
    { time: "10:15 AM", activity: "Revision slot — Inorganic Chemistry (yesterday's topics)", kalnehiRole: "Revision Tracker showed this topic as due; you added it to today's plan" },
    { time: "11:00 AM – 1:00 PM", activity: "Mathematics — Calculus", kalnehiRole: "Syllabus Tracker updated after session" },
    { time: "2:00 – 4:00 PM", activity: "On-camera study session — Organic Chemistry", kalnehiRole: "On-Camera mode for accountability during the post-lunch slump" },
    { time: "4:30 PM", activity: "Mock test analysis", kalnehiRole: "Marks Engine — log scores, identify topic-wise weak areas, get Mastermind recommendations" },
    { time: "6:00 PM", activity: "Doubt resolution session", kalnehiRole: "Doubt Tracker — all open doubts logged and reviewed" },
    { time: "9:00 PM", activity: "Next day planning", kalnehiRole: "Daily Planner — tomorrow's sessions auto-suggested based on coverage and revision schedule" },
  ],
  features: [
    { title: "Mastermind", why: "In a drop year, you need someone to tell you what to prioritize today, this week, and this month — not generic advice. Mastermind understands your JEE syllabus coverage and mock performance." },
    { title: "Syllabus Tracker", why: "JEE Main + Advanced covers 300+ topics across Physics, Chemistry, and Maths. Tracking which topics you've done thoroughly (not just touched) is non-negotiable." },
    { title: "Marks Engine", why: "Mock performance data without analysis is noise. The Marks Engine converts your scores into actionable topic-level insights." },
    { title: "Revision Tracker", why: "You studied Rotational Motion three months ago. Without dated follow-ups, you'll forget most of it before the exam. A visible due list makes the next review unavoidable." },
    { title: "On-Camera Study", why: "The afternoon slump is real. Isolation makes it worse. On-camera mode adds accountability when there's no one physically present." },
    { title: "Consistency Tracker", why: "A drop year is won or lost on consistency, not on any single study day. The tracker shows you your true study hours — not planned, actual." },
  ],
  faqs: [
    { q: "How many hours should a JEE dropper study?", a: "8-10 hours of focused study daily is the standard benchmark for serious droppers. More important than hours is quality — 8 hours of tracked, structured study beats 12 hours of unfocused sitting. Kalnehi Daily tracks actual focused study time, not time at the desk." },
    { q: "What's the first thing a dropper should do in Kalnehi Daily?", a: "Set up your JEE syllabus in the Syllabus Tracker and log your last JEE rank or mock score in the Marks Engine. This gives Mastermind enough context to give useful advice from day one." },
    { q: "How should revision be structured in a drop year?", a: "Class 11 topics need at least 2-3 revision cycles before the exam. Class 12 topics need coverage first, then revision. Use Revision Tracker to set the next due date each time you finish a topic or review pass." },
    { q: "How do I stay consistent when there's no external pressure?", a: "Build the daily log habit first. 30 seconds every morning to log yesterday. This single habit, done consistently, creates accountability. The Consistency Tracker then makes your actual hours visible — it's hard to fool yourself when you see the number." },
  ],
  relatedExams: ["jee", "jee-main", "jee-advanced"],
  relatedFeatures: ["prepbrain-ai", "syllabus-tracker", "marks-engine", "spaced-revision", "consistency-tracker"],
};

const neetDroppers: UseCaseData = {
  slug: "neet-droppers",
  audienceLabel: "NEET Droppers",
  headline: "Kalnehi Daily for NEET Droppers: Building a System for Your Final Attempt",
  subheadline: "Most NEET droppers don't fail because of intelligence. They fail because their preparation system doesn't match the exam's demands.",
  intro: "NEET has become one of the most competitive examinations in India. With 20+ lakh students competing for 1 lakh MBBS seats, the margin between selection and non-selection is razor thin — often just 5-10 marks. In a drop year, the question isn't whether you can work harder. It's whether you can work smarter and more consistently than you did the last time.",
  challenges: [
    "NEET biology has 1000+ topics — tracking coverage without a system is impossible",
    "Chemistry NCERT requires multiple revisions with diminishing returns if untracked",
    "Physics conceptual gaps from Class 11 that were never properly addressed",
    "Psychological pressure of being a dropper in a social context that stigmatizes it",
    "Difficulty differentiating between 'studied this' and 'know this well enough for NEET'",
  ],
  dayInTheLife: [
    { time: "5:30 AM", activity: "Review previous day log and set today's intention", kalnehiRole: "Daily Log — what did I actually study vs what I planned?" },
    { time: "6:00 – 9:00 AM", activity: "Biology — Genetics and Evolution", kalnehiRole: "Syllabus Tracker updated. Diversity of Life due for review (set in Revision Tracker)" },
    { time: "9:15 AM", activity: "Mastermind check-in", kalnehiRole: "Ask Mastermind: which Chemistry chapters have I not revised in 2+ weeks?" },
    { time: "10:00 AM – 12:00 PM", activity: "Chemistry — Organic, Chapter by chapter", kalnehiRole: "Study Timer with target. Doubts logged via voice." },
    { time: "1:30 – 3:30 PM", activity: "Physics — Optics and Modern Physics", kalnehiRole: "On-Camera mode for afternoon accountability" },
    { time: "4:00 PM", activity: "NEET mock analysis", kalnehiRole: "Marks Engine — topic-wise accuracy review" },
    { time: "5:00 PM", activity: "Doubt clearance session", kalnehiRole: "Doubt Tracker — address 3-5 open doubts per day" },
    { time: "9:00 PM", activity: "Tomorrow's plan", kalnehiRole: "Daily Planner — Mastermind suggests what to cover based on gaps" },
  ],
  features: [
    { title: "Syllabus Tracker", why: "NEET Biology has chapters across Botany and Zoology that must all be covered. The tracker tells you exactly where you are, not where you think you are." },
    { title: "Mastermind", why: "Mastermind understands NEET's chapter-wise weightage and can tell you what to prioritize when time is short — based on your actual coverage, not generic advice." },
    { title: "Revision Tracker", why: "NEET NCERT revision is the exam. Students who revise Biology NCERT 5+ times consistently outperform those who read it more times without tracking." },
    { title: "Marks Engine", why: "NEET is a single paper — every mark matters. The Marks Engine converts mock scores into chapter-level insights, showing exactly where those lost marks are going." },
    { title: "Doubt Tracker", why: "Biology doubts in NEET are specific — exact NCERT line, exact chapter. Tracking and resolving doubts systematically is how toppers clear conceptual gaps." },
  ],
  faqs: [
    { q: "How many NEET revisions are enough?", a: "Physics and Chemistry need 3-4 thorough revisions. Biology NCERT needs 5-7 revisions for most students to reach retention levels required for NEET accuracy. Revision Tracker help you stick to those intervals with clear due dates." },
    { q: "Should a NEET dropper join coaching again?", a: "This depends on specific gaps. If conceptual understanding is the issue, coaching helps. If it's about coverage and revision, a strong self-study system can be more effective. Mastermind can help identify which gap is yours." },
    { q: "How should I handle Biology given the volume?", a: "Divide it into weekly coverage targets and daily revision slots. The Syllabus Tracker makes this manageable — you always know which chapters need attention next." },
  ],
  relatedExams: ["neet", "neet-pg"],
  relatedFeatures: ["prepbrain-ai", "syllabus-tracker", "spaced-revision", "marks-engine", "doubt-tracker"],
};

const class11Students: UseCaseData = {
  slug: "class-11-students",
  audienceLabel: "Class 11 Students",
  headline: "Kalnehi Daily for Class 11 Students Preparing for JEE/NEET",
  subheadline: "Class 11 is where exam preparation is won or lost. Most students realize this too late.",
  intro: "Class 11 is the foundation year for JEE and NEET. The concepts covered — mechanics, thermodynamics, organic chemistry fundamentals, cell biology — form 40-45% of both exams. Students who build strong Class 11 foundations with proper tracking and revision systems dramatically outperform those who treat Class 11 as 'less important' than Class 12.",
  challenges: [
    "School + coaching + self-study time management with no experience doing this",
    "Understanding which concepts need deep mastery vs surface coverage",
    "Building study habits before the pressure of Class 12 arrives",
    "Keeping up with school exams while preparing for JEE/NEET",
    "Parents and teachers giving conflicting advice about how to allocate time",
  ],
  dayInTheLife: [
    { time: "6:00 AM", activity: "30-minute revision before school", kalnehiRole: "Revision Tracker — quick review of topics you marked due" },
    { time: "7:00 – 2:00 PM", activity: "School", kalnehiRole: "Voice-log any doubts from class when possible" },
    { time: "4:00 – 6:00 PM", activity: "Coaching class", kalnehiRole: "Mark topics as 'introduced' in Syllabus Tracker after class" },
    { time: "6:30 – 8:30 PM", activity: "Self-study — solve problems from today's coaching topics", kalnehiRole: "Study Timer. Doubt Tracker for unsolved problems." },
    { time: "9:00 PM", activity: "Daily log and tomorrow planning", kalnehiRole: "5-minute log. Mastermind suggests if revision should be added tomorrow." },
  ],
  features: [
    { title: "Syllabus Tracker", why: "Knowing exactly which Class 11 topics you've covered vs which are pending prevents the panic of 'I haven't studied this' in Class 12." },
    { title: "Study Timer", why: "Building the deep work habit in Class 11 — 90-minute focused sessions without phone — is the most valuable thing a student can do before Class 12 intensity." },
    { title: "Doubt Tracker", why: "Doubts left unresolved in Class 11 Physics and Chemistry come back as conceptual blocks in Class 12. Systematic doubt resolution prevents this." },
    { title: "Mastermind", why: "When you're starting out, knowing what to prioritize and how to approach each subject for JEE/NEET specifically is more valuable than generic study tips." },
    { title: "Daily Planner", why: "Managing school + coaching + self-study requires a daily plan that accounts for all three. The Daily Planner makes this manageable without overcomplication." },
  ],
  faqs: [
    { q: "When should a Class 11 student start serious JEE/NEET preparation?", a: "From the first day of Class 11. The students who treat Class 11 seriously — covering concepts properly, building revision habits — consistently outperform those who 'get serious in Class 12'." },
    { q: "How many hours should a Class 11 student study beyond school and coaching?", a: "2-3 hours of focused self-study daily is a realistic and effective target. Quality matters more than quantity at this stage — building the habit of focused study is as important as the hours." },
    { q: "Should I use Kalnehi Daily if I go to coaching?", a: "Yes. Coaching covers concepts. Kalnehi Daily tracks whether you've actually studied them, schedules revision, and helps you manage the time between coaching sessions. They serve different purposes." },
  ],
  relatedExams: ["jee", "neet", "jee-main"],
  relatedFeatures: ["syllabus-tracker", "study-timer", "doubt-tracker", "daily-planner", "prepbrain-ai"],
};

const class12Students: UseCaseData = {
  slug: "class-12-students",
  audienceLabel: "Class 12 Students",
  headline: "Kalnehi Daily for Class 12 Students: Boards + JEE/NEET at the Same Time",
  subheadline: "Class 12 is the year everything happens simultaneously. The students who survive it with good results in both boards and entrance exams have one thing in common: a system.",
  intro: "Class 12 is unique in Indian education — students must prepare for board exams, JEE/NEET, and manage coaching, school, and personal life simultaneously. Most students underestimate the complexity until it's too late. Kalnehi Daily is built to handle this multi-front preparation without sacrificing performance on any front.",
  challenges: [
    "Boards and entrance exams have overlapping but different syllabi — knowing what to prioritize when",
    "Coaching, school tests, and mock exams compete for the same time",
    "Stress management during a high-stakes year",
    "Ensuring Class 11 topics are revised while covering new Class 12 content",
    "Making the most of the months between board exams and JEE/NEET",
  ],
  dayInTheLife: [
    { time: "5:30 AM", activity: "Board exam prep — revision of yesterday's chapter", kalnehiRole: "Revision Tracker — board and entrance topics in one due list" },
    { time: "7:00 AM – 2:00 PM", activity: "School", kalnehiRole: "Doubts from school labs/practicals logged" },
    { time: "4:00 – 6:30 PM", activity: "Coaching", kalnehiRole: "Topics marked in Syllabus Tracker" },
    { time: "7:00 – 9:30 PM", activity: "JEE/NEET self-study — problem solving", kalnehiRole: "Study Timer. Mastermind suggests whether to focus on board-heavy or entrance-heavy topics today." },
    { time: "9:30 PM", activity: "Log + next day plan", kalnehiRole: "Daily Planner — Mastermind balances boards vs entrance for tomorrow" },
  ],
  features: [
    { title: "Mastermind", why: "The unique value in Class 12 is AI that understands both boards and entrance exams and can tell you when to prioritize which — especially in the critical months before board exams." },
    { title: "Syllabus Tracker", why: "Track boards and JEE/NEET coverage in parallel. Know at a glance which topics are board-only, entrance-only, or overlapping (the easiest wins)." },
    { title: "Revision Tracker", why: "Class 11 topics studied months ago need revision before entrance exams. A dated queue keeps them visible during the Class 12 crunch." },
    { title: "Marks Engine", why: "Track both board test performance and mock test performance. See where you're strong and weak in both streams simultaneously." },
    { title: "Daily Planner", why: "A plan that accounts for school, coaching, board prep, and entrance prep is complex to create manually. The Daily Planner handles this coordination." },
  ],
  faqs: [
    { q: "How do I balance boards and JEE/NEET in Class 12?", a: "Focus on overlapping topics first — they give you gains in both. For board-only topics, cover them systematically in the months before board exams. Use Mastermind to get specific advice based on your current coverage and upcoming dates." },
    { q: "When should I start mocks for JEE/NEET?", a: "January of Class 12 is the standard benchmark. Earlier if you feel coverage is strong. The Marks Engine tracks your mock progression over time." },
    { q: "What should I do after board exams are over?", a: "Full switch to entrance exam mode. Use the Syllabus Tracker to identify which topics haven't been touched since Class 11 and attack them first. Mastermind can generate a specific revision plan for this period." },
  ],
  relatedExams: ["jee", "neet", "cbse-class-12", "jee-main"],
  relatedFeatures: ["prepbrain-ai", "syllabus-tracker", "daily-planner", "marks-engine", "spaced-revision"],
};

const upscWorkingProfessionals: UseCaseData = {
  slug: "upsc-working-professionals",
  audienceLabel: "UPSC Working Professionals",
  headline: "Kalnehi Daily for UPSC Aspirants Who Are Still Working",
  subheadline: "Preparing for UPSC while employed is one of the hardest things an aspirant can choose to do. It requires every available hour to count.",
  intro: "A significant portion of UPSC candidates — especially those preparing for Mains and Interview rounds — are working professionals. With 8-10 hours of professional commitments daily and UPSC's enormous syllabus spanning GS 1-4, Optional, and Essay, the margin for wasted time is zero. Kalnehi Daily is designed to maximize the value of limited preparation hours.",
  challenges: [
    "Limited study hours — typically 3-4 hours on weekdays, 6-8 on weekends",
    "Mental exhaustion after work reducing study effectiveness",
    "Current affairs requires daily reading alongside deep subject study",
    "No fixed timetable possible — work schedules change",
    "Difficult to know which areas to prioritize given limited time",
  ],
  dayInTheLife: [
    { time: "5:30 – 7:00 AM", activity: "Morning study session — UPSC reading or revision", kalnehiRole: "Mastermind suggests what to cover based on coverage gaps. Study Timer for focused sessions." },
    { time: "7:30 AM – 6:30 PM", activity: "Work", kalnehiRole: "Voice-log current affairs notes during commute" },
    { time: "7:00 – 9:30 PM", activity: "Evening study — answer writing or optional subject", kalnehiRole: "Study Timer. Doubt Tracker for gaps to address on weekend." },
    { time: "9:30 PM", activity: "Daily log", kalnehiRole: "30-second log. Mastermind adjusts tomorrow's suggestion if today was cut short." },
    { time: "Weekend", activity: "Deep dives — History, Polity, Geography", kalnehiRole: "Syllabus Tracker to identify least-covered areas. Revision Tracker for what's due next." },
  ],
  features: [
    { title: "Mastermind", why: "For working professionals, Mastermind's ability to give specific, prioritized advice — 'you have 3 hours today, cover these two Polity chapters' — is the most valuable feature." },
    { title: "Voice Control", why: "Voice study planning means you can log sessions, add doubts, and plan without screen time — useful during commutes or transitions between work and study." },
    { title: "Daily Planner", why: "A planner that adapts to irregular hours is essential. Working professionals rarely have the same time available each day. The Daily Planner handles this variation." },
    { title: "Syllabus Tracker", why: "UPSC GS covers 5 papers of 250 marks each. Tracking coverage across History, Polity, Economy, Environment, and Optional is impossible without a system." },
    { title: "Consistency Tracker", why: "Long preparation timelines (1-3 years) make consistency the primary variable. The tracker keeps you honest about whether you're actually studying on most days." },
  ],
  faqs: [
    { q: "How many hours does a UPSC working professional need to study?", a: "Most successful candidates who prepared while working studied 4-6 hours daily on average. The key is actual focused hours, not total time at desk. Kalnehi Daily's Study Timer tracks this precisely." },
    { q: "Should I quit my job to prepare for UPSC?", a: "This is a personal financial and risk decision. Many candidates clear UPSC while working. The advantage of continuing to work is financial stability and not having the pressure of 'I left everything for this'. A strong preparation system makes the dual life manageable." },
    { q: "How do I handle current affairs with limited time?", a: "Daily 30-45 minutes of structured current affairs reading (one good source) is more effective than 2 hours of scattered reading. Mastermind can help you identify the high-priority themes to track." },
    { q: "Can I prepare for UPSC Mains and work simultaneously?", a: "Yes, many candidates do. Mains requires answer writing practice — which can be done in 60-90 minute focused sessions. The key is consistency over months, not marathon sessions." },
  ],
  relatedExams: ["upsc"],
  relatedFeatures: ["prepbrain-ai", "voice-control", "daily-planner", "syllabus-tracker", "consistency-tracker"],
};

const caStudents: UseCaseData = {
  slug: "ca-students",
  audienceLabel: "CA Students",
  headline: "Kalnehi Daily for CA Foundation, Intermediate and Final Students",
  subheadline: "CA examinations have among the lowest pass rates of any professional examination in India. The students who clear them on their first attempt have preparation systems, not just determination.",
  intro: "CA Foundation, CA Intermediate, and CA Final have a combined pass rate below 15% across both groups. The examinations are not just difficult — they're designed to test thorough understanding across Accounting, Law, Finance, and Taxation simultaneously. Preparation without a systematic approach to syllabus coverage and revision leads to failure regardless of hours spent.",
  challenges: [
    "Articleship during CA Intermediate creates extreme time pressure",
    "Multiple subjects across two groups requiring simultaneous preparation",
    "ICAI syllabus updates require staying current with amendments",
    "Standards of Accounting and Law require both understanding and memorization",
    "Low pass rates create psychological pressure that derails many candidates",
  ],
  dayInTheLife: [
    { time: "5:30 – 7:00 AM", activity: "Law or SFM revision before articleship", kalnehiRole: "Revision Tracker — due items surface before you open the planner" },
    { time: "9:00 AM – 7:00 PM", activity: "Articleship / office", kalnehiRole: "Voice-log doubts or exam-related observations from practical work" },
    { time: "8:00 – 10:30 PM", activity: "Evening study session — Accounts or Taxation", kalnehiRole: "Study Timer. Syllabus Tracker updated. Mastermind prioritizes based on exam date proximity." },
    { time: "10:30 PM", activity: "Daily log", kalnehiRole: "30-second log. Consistency tracker updated." },
  ],
  features: [
    { title: "Syllabus Tracker", why: "CA syllabi across Foundation, Inter, and Final are complex multi-subject systems. Tracking coverage across Group 1 and Group 2 subjects without missing critical chapters is only possible systematically." },
    { title: "Revision Tracker", why: "Law and accounting standards require multiple revisions at the right intervals. Dated reminders help you revisit January sections before May/November attempts without relying on memory." },
    { title: "Mastermind", why: "Mastermind understands CA examination structure and can give specific advice — which standards to prioritize, how much time Accounts needs vs Law — based on your coverage and exam date." },
    { title: "Study Timer", why: "CA preparation alongside articleship means every evening hour must be used effectively. The Study Timer creates focused sessions and tracks actual productive hours." },
    { title: "Consistency Tracker", why: "CA preparation spans 18-24 months for Intermediate and Final combined. Consistency over this period is the strongest predictor of success." },
  ],
  faqs: [
    { q: "How should I manage CA Intermediate preparation during articleship?", a: "Morning sessions (5:30-7:30 AM) for revision of previous day's material, evening sessions (8-11 PM) for new content, and weekend deep dives for harder subjects. Mastermind can help you allocate time across subjects based on which exam group is sooner." },
    { q: "How many revisions does CA Inter need?", a: "Accounts and Law need at least 3-4 thorough revisions before the exam. Track each cycle with Revision Tracker so nothing is skipped. SFM and Taxation need problem-solving practice alongside reading." },
    { q: "Can Kalnehi Daily track ICAI amendments?", a: "The Syllabus Tracker lets you mark topics as 'current' or 'amended' so you know which sections need refreshing. Mastermind can remind you to check for amendments before exams." },
  ],
  relatedExams: ["ca-foundation", "ca-intermediate", "ca-final"],
  relatedFeatures: ["syllabus-tracker", "spaced-revision", "prepbrain-ai", "study-timer", "consistency-tracker"],
};

const engineeringStudentsGate: UseCaseData = {
  slug: "engineering-students-gate",
  audienceLabel: "Engineering Students (GATE)",
  headline: "Kalnehi Daily for Engineering Students Preparing for GATE",
  subheadline: "GATE preparation alongside a B.Tech degree is uniquely challenging — you're covering advanced topics for an exam while managing coursework, projects, and placements.",
  intro: "GATE has become one of the most sought-after engineering examinations in India, with applications from IITs, PSUs, and research institutes all requiring strong GATE scores. Preparing for GATE during B.Tech means managing 4th year projects, placements, coursework, and GATE prep simultaneously — a juggling act that requires a system, not just motivation.",
  challenges: [
    "4th year B.Tech has project work, internships, and placements running in parallel",
    "GATE syllabus is deeper than most B.Tech courses — new concepts on top of known ones",
    "Previous years' question patterns require systematic practice",
    "Subject weightage varies significantly — allocating time correctly is non-trivial",
    "GATE score validity and PSU cutoffs require knowing target scores precisely",
  ],
  dayInTheLife: [
    { time: "6:00 – 8:00 AM", activity: "GATE subject study — core concepts", kalnehiRole: "Syllabus Tracker. Mastermind suggests which subjects have the highest weightage gap." },
    { time: "9:00 AM – 5:00 PM", activity: "College / project work / placements", kalnehiRole: "Log any GATE-relevant coursework in Syllabus Tracker" },
    { time: "6:00 – 8:00 PM", activity: "GATE problem solving — previous year questions", kalnehiRole: "Study Timer. Marks Engine for accuracy tracking by subject." },
    { time: "8:30 PM", activity: "Daily log + next day planning", kalnehiRole: "Mastermind adjusts tomorrow based on how placements or project disrupted today" },
  ],
  features: [
    { title: "Syllabus Tracker", why: "GATE CS, ECE, ME, or CE syllabi are 15-20 subjects each. Tracking coverage across all of them while knowing which have higher weightage requires systematic tracking." },
    { title: "Mastermind", why: "Mastermind understands GATE subject weightages and can tell you to spend more time on TOC and OS than on less-weighted subjects — critical advice when preparation time is limited." },
    { title: "Marks Engine", why: "GATE previous year accuracy by subject reveals exactly where your marks are being lost. The Marks Engine tracks this across practice sessions." },
    { title: "Daily Planner", why: "GATE preparation alongside placement season (August-December) and project deadlines requires a planner that adapts to irregular availability." },
    { title: "Consistency Tracker", why: "GATE preparation typically happens over 6-12 months. Students who study every day for 2 hours consistently outperform those who study 8 hours for a week and then stop." },
  ],
  faqs: [
    { q: "When should an engineering student start GATE preparation?", a: "Ideally from 3rd year, but meaningful preparation in 6-8 months before the exam (typically August-February) is achievable for students with strong fundamentals. Earlier starts allow more revision cycles." },
    { q: "How to manage GATE prep alongside placements?", a: "GATE and placements have different skill requirements but significant overlap in CS fundamentals. Treat November-December as a dual preparation period. After placements conclude, shift focus fully to GATE. Mastermind can help you navigate this." },
    { q: "How many hours of GATE prep are needed alongside B.Tech?", a: "3-4 hours of focused study daily is the standard target. On heavy college days, even 1.5-2 hours of high-quality practice matters. Consistency matters more than maximizing any single day." },
  ],
  relatedExams: ["gate"],
  relatedFeatures: ["syllabus-tracker", "prepbrain-ai", "marks-engine", "daily-planner", "consistency-tracker"],
};

export const USE_CASES: UseCaseData[] = [
  jeeDroppers,
  neetDroppers,
  class11Students,
  class12Students,
  upscWorkingProfessionals,
  caStudents,
  engineeringStudentsGate,
];

export function getAllUseCases(): UseCaseData[] {
  return USE_CASES;
}

export function getUseCaseBySlug(slug: string): UseCaseData | undefined {
  return USE_CASES.find((u) => u.slug === slug);
}

export function getUseCaseSlugs(): string[] {
  return USE_CASES.map((u) => u.slug);
}
