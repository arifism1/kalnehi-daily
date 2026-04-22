export interface FeatureData {
  slug: string;
  name: string;
  tagline: string;
  headline: string;
  description: string;
  scenarios: string[];
  examCompatibility: string;
  relatedFeatures: string[];
  relatedExams: string[];
  faqs: { question: string; answer: string }[];
  metaDescription: string;
}

const FEATURES: FeatureData[] = [
  {
    slug: "prepbrain-ai",
    name: "PrepBrain AI",
    tagline: "Your Personal Exam Strategist",
    headline: "PrepBrain AI — Your Personal Exam Strategist That Reads Your Own Data",
    description: `PrepBrain AI is not a general chatbot. It's a study coach that reads your specific Kalnehi data — your syllabus completion, your daily logs, your mock scores, your target exam date — and gives you strategy advice that's personalised to exactly where you are right now.

Ask PrepBrain "What should I study for the next 3 hours?" and it doesn't give a generic answer. It looks at your JEE or NEET chapter completion, cross-references historical weightage data, checks what you logged yesterday, and tells you the specific chapters that will move your readiness score the most.

PrepBrain can analyse your mock test performance and identify which subject or topic area is consistently pulling your aggregate down. It can tell you whether you're spending proportional time across subjects. It can plan your final revision month chapter by chapter.

This is not AI for the sake of AI. PrepBrain exists because the single hardest problem in exam preparation is knowing what to study right now — not in general, but today, at your current level, with your specific exam date. PrepBrain answers that question every single day.`,
    scenarios: [
      "It's Sunday evening. You open Kalnehi and ask PrepBrain: 'Plan my week.' It reads your JEE date (89 days away), your syllabus completion (Physics 70%, Chemistry 55%, Maths 80%), and your last 3 mock scores. It gives you a day-by-day plan for the week: which chapters to cover, how many hours per subject, and when to write the next practice test.",
      "You just finished a NEET mock and scored 480. PrepBrain reads the score, compares it to your last 5 mocks, and tells you: 'Your Biology accuracy has dropped 12% over the last 3 tests. The weakest area is Genetics and Molecular Biology. You need 4 focused hours on these chapters before the next mock.'",
      "It's 6 AM and you have 2 hours before college. You say 'Hey Boss, what should I study right now?' PrepBrain looks at your current completion and exam date, and says: 'Cover Acids and Bases in Chemistry — 2-hour chapter, high weightage in JEE Main, not yet completed in your tracker.'",
      "A month before your UPSC Prelims, you ask PrepBrain for a revision strategy. It analyses your GS completion across History, Polity, Geography, Economy and Environment, identifies the 3 weakest areas, and builds a 30-day revision plan that covers each topic at least once.",
    ],
    examCompatibility: "PrepBrain AI works for all supported exams — JEE, NEET, UPSC, CAT, GATE, CA, SSC, Banking, CLAT and more. It adapts its strategy advice based on your specific exam context.",
    relatedFeatures: ["syllabus-tracker", "marks-engine", "voice-control"],
    relatedExams: ["/jee", "/neet", "/upsc", "/cat", "/gate"],
    faqs: [
      { question: "What data does PrepBrain AI use to give advice?", answer: "PrepBrain reads your Kalnehi data — syllabus completion percentages, daily study logs, mock test scores you've entered, your target exam date, and your study session history. It never accesses anything outside Kalnehi." },
      { question: "Is PrepBrain AI a chatbot or a study planner?", answer: "It's a contextual study coach. You can ask it questions ('What should I study today?') or request analysis ('Why is my Chemistry score not improving?'). It uses your Kalnehi data to answer specifically, not generically." },
      { question: "How many PrepBrain AI queries do I get?", answer: "Smart Plan includes 20 lakh (2 million) PrepBrain AI tokens per month, which resets every billing cycle. The Smart Trial (₹19) includes 5 lakh tokens for 3 days. Basic Plan has no AI access." },
      { question: "Is PrepBrain's advice accurate for all exams?", answer: "PrepBrain's strategy advice is based on your own data — completion rates, time invested, test scores. It doesn't hallucinate syllabus details because it's reading your actual tracker. For exam-specific weightage, it uses historical patterns that are updated periodically." },
    ],
    metaDescription: "PrepBrain AI reads your syllabus completion, mock scores and study logs to give personalised exam strategy advice. Not a chatbot — a data-driven study coach for JEE, NEET, UPSC and more.",
  },
  {
    slug: "voice-control",
    name: "Voice Control",
    tagline: "Run Your Entire Prep Without Typing",
    headline: "Voice Control — Run Your Entire Exam Prep Without Typing a Single Word",
    description: `"Hey Boss" is Kalnehi's global voice command system. It lets you log study sessions, mark chapters complete, set reminders, navigate the app, and ask PrepBrain AI questions — all hands-free, all while your phone sits face-down on the desk.

Voice control is designed for the reality of serious exam preparation: you're 3 hours into a Physics problem set, you've just finished the Rotational Motion chapter, and you don't want to pick up your phone to update your tracker. You just say "Hey Boss, mark Rotational Motion done" and keep working.

The voice command vocabulary covers the entire Kalnehi feature set. You can dictate your daily plan for the next 12 hours, log doubts, set alarms for the next morning, ask PrepBrain for advice, and check your remaining syllabus — all without touching the screen.

For aspirants who study in deep focus states, voice control preserves that state. For those who study in libraries or quiet environments, voice commands can be whispered. For those using Kalnehi during commutes, voice control makes logging possible while moving.`,
    scenarios: [
      "It's 6 AM. You just woke up. Instead of opening your phone and typing your day's plan, you say 'Hey Boss, dictate my day' and speak your plan for the next 12 hours: 3 hours Physics, 2 hours Chemistry, coaching at 4 PM, 2 more hours Maths in the evening. Done before breakfast.",
      "You're deep in an Organic Chemistry problem set. You finish the chapter on Carbonyl Compounds. Without breaking your flow, you say 'Hey Boss, mark Carbonyl Compounds as done' and keep going. Your tracker updates automatically.",
      "After a GATE mock test, you're reviewing your answers. You discover you got 4 wrong in Operating Systems. You say 'Hey Boss, log a doubt — OS Process Scheduling, I confuse Round Robin with FCFS.' The doubt is captured in your Kanban doubt tracker for later review.",
      "It's 11 PM and you're about to sleep. You say 'Hey Boss, set a 5:30 AM alarm and remind me to read The Hindu current affairs at 6 AM.' Both are set. You close your eyes.",
    ],
    examCompatibility: "Voice control works for all exams and all features. Especially useful for UPSC aspirants logging current affairs, NEET/JEE aspirants in deep study sessions, and banking/SSC aspirants who study during commutes.",
    relatedFeatures: ["daily-planner", "doubt-tracker", "prepbrain-ai"],
    relatedExams: ["/jee", "/neet", "/upsc", "/gate"],
    faqs: [
      { question: "What can I do with Hey Boss voice commands?", answer: "Log study sessions, mark chapters done/needs revision, set reminders and alarms, dictate your daily plan, ask PrepBrain AI questions, log doubts, check syllabus completion, navigate between Kalnehi sections, and record voice affirmations — all without touching the screen." },
      { question: "Does voice control work offline?", answer: "Voice recognition requires an internet connection for processing. However, Kalnehi caches your recent data so the app remains usable offline — you just can't issue voice commands without connectivity." },
      { question: "How many minutes of voice control do I get?", answer: "Smart Plan includes 60 minutes of voice control per month, which resets on your billing date. Smart Trial (₹19 for 3 days) includes 15 minutes. Basic Plan has no voice control access." },
      { question: "Is Hey Boss always listening?", answer: "No. Hey Boss only activates when you tap the microphone button or enable the wake word mode manually. Kalnehi does not run background audio processing without explicit user permission." },
    ],
    metaDescription: "Hey Boss voice control lets you log study sessions, mark chapters, set reminders and ask PrepBrain AI — all hands-free. Built for JEE, NEET, UPSC and all competitive exam aspirants.",
  },
  {
    slug: "syllabus-tracker",
    name: "Syllabus Tracker",
    tagline: "Track Every Chapter. Miss Nothing.",
    headline: "Syllabus Tracker — Track Every Chapter at Microtopic Level, Miss Nothing",
    description: `The Syllabus Tracker is the backbone of Kalnehi. It lets you track your preparation at the microtopic level — not just "Physics done" but "Rotational Motion — Moment of Inertia — done, Angular Momentum — needs revision."

For JEE, this means all ~720 topics across Physics, Chemistry and Mathematics. For NEET, all ~97 chapters across Biology, Physics and Chemistry. For UPSC, GS1-4 topics, Optional subject chapters, and Current Affairs coverage. For CA, all papers within Foundation/Intermediate/Final.

Each topic can be marked as: Not started, In progress, Done, or Needs revision. The tracker calculates your completion percentage per subject and overall. PrepBrain AI reads this data to give you strategy advice.

The spaced revision engine is connected to the tracker — when you mark a chapter as "Done," it schedules review sessions at 1 day, 3 days, 1 week, 2 weeks, and 1 month. You never have to manually figure out what to revise.

The tracker also shows your Target Score Blueprint — which chapters have the highest weightage for your exam — so you can prioritise where to spend your time when you can't cover everything.`,
    scenarios: [
      "A JEE aspirant opens the syllabus tracker 90 days before the exam. Physics shows 65% complete, Chemistry 72%, Maths 80%. PrepBrain reads this and immediately says: 'Physics is your highest risk — here are the 8 Physics chapters with the highest JEE weightage that you haven't completed yet. Cover these in the next 2 weeks.'",
      "A NEET aspirant marks Genetics as 'Done' after finishing it for the first time. The spaced revision engine automatically schedules a Genetics review for tomorrow (1-day interval), then in 3 days, then in 1 week. They don't have to think about when to revise — it's planned.",
      "A UPSC aspirant uses the syllabus tracker across GS1, GS2, GS3, GS4, Essay, and their Optional (History). PrepBrain monitors all 6 tracks and alerts them when GS4 (Ethics) is 3 weeks behind schedule relative to the others.",
      "A CA Intermediate student tracks all 8 papers across 2 groups. Before their mock exam, they open the tracker and see Paper 6 (Auditing) is only 40% complete while everything else is 70%+. They reallocate 10 hours to Auditing that week.",
    ],
    examCompatibility: "Syllabus Tracker is exam-agnostic — add any exam's syllabus structure. Pre-configured for JEE, NEET, UPSC, CAT, GATE, CA Foundation/Intermediate/Final, SSC, Banking, CLAT, NDA, CUET and Class 12 Boards.",
    relatedFeatures: ["spaced-revision", "prepbrain-ai", "marks-engine"],
    relatedExams: ["/jee", "/neet", "/upsc", "/gate", "/ca-intermediate"],
    faqs: [
      { question: "How detailed is the syllabus tracker?", answer: "The tracker works at the microtopic level — you can track individual subtopics within each chapter, not just the chapter itself. For JEE Physics, that means tracking Kinematics, Laws of Motion, Work-Energy Theorem, Circular Motion, and Rotational Motion as separate trackable units." },
      { question: "Can I add a custom syllabus?", answer: "Yes. While Kalnehi has pre-configured syllabuses for major exams, you can add any exam's syllabus manually. Create subjects, add chapters, and add topics within each chapter." },
      { question: "Does the syllabus tracker sync across devices?", answer: "Yes. Your syllabus data is synced to the cloud and available on all your devices — phone, tablet, desktop — in real time." },
      { question: "How does the tracker connect to PrepBrain AI?", answer: "PrepBrain reads your syllabus completion percentages, the specific chapters marked as 'Needs revision,' and when each chapter was last studied. This data powers PrepBrain's strategy advice — it's what makes PrepBrain give you specific, actionable recommendations rather than generic study tips." },
    ],
    metaDescription: "Kalnehi's Syllabus Tracker lets you mark every chapter and topic — Done, In Progress, Needs Revision. Pre-built for JEE, NEET, UPSC, CAT, GATE, CA and 20+ Indian competitive exams.",
  },
  {
    slug: "spaced-revision",
    name: "Spaced Revision Engine",
    tagline: "Never Forget What You've Studied",
    headline: "Spaced Revision Engine — The Science of Never Forgetting a Chapter",
    description: `The Spaced Revision Engine is built on one of the most well-researched findings in learning science: the spacing effect. When you study something and then review it at increasing intervals (1 day, 3 days, 7 days, 14 days, 30 days), you retain it permanently with far less total study time than re-reading it repeatedly.

Kalnehi's Spaced Revision Engine connects to your syllabus tracker. When you mark a chapter as "Done," the engine automatically schedules revision sessions at spaced intervals. When a revision is due, it appears in your daily plan. You don't have to think about what to revise — the system tells you.

For JEE and NEET aspirants, this is critical. The syllabus is large enough that chapters studied in June are often forgotten by November. The revision engine ensures you don't have to start from scratch when exam time comes — because you never fully forgot the chapter to begin with.

The engine also learns from your "Needs Revision" markings — chapters you've flagged as difficult get more frequent review intervals than chapters you found easy.`,
    scenarios: [
      "A JEE aspirant finishes Rotational Motion in September. The spaced revision engine schedules a review for the next day, then again in 3 days, then in 1 week, then 2 weeks, then a month. By December, when JEE Main preparation intensifies, Rotational Motion is firmly in long-term memory — not a chapter they need to 'redo.'",
      "A UPSC aspirant finishes reading Laxmikant (Polity) Chapter 12 in March. The engine schedules a revision in 1 week. When the revision comes up, they spend 20 minutes reviewing rather than 3 hours re-reading. By the time Prelims arrives in May, they've reviewed every Polity chapter at least twice.",
      "A CA Intermediate student marks Accounting Standards as 'Needs Revision' after struggling with AS 10 and AS 16. The engine assigns shorter intervals for these standards — they appear more frequently in the daily plan until mastered.",
      "A NEET aspirant opens Kalnehi and sees their daily plan includes: 'Revision: Genetics (due today), Revision: Cell Division (due today).' These chapters were marked done 14 days ago. The 15-minute revision refreshes the memory with minimal time investment.",
    ],
    examCompatibility: "Spaced revision is most critical for high-content exams: JEE (large syllabus), NEET (Biology is heavy), UPSC (GS + Optional = 2-year content), CA (8 papers of advanced content). Benefits all exams with revision needs.",
    relatedFeatures: ["syllabus-tracker", "prepbrain-ai", "daily-planner"],
    relatedExams: ["/jee", "/neet", "/upsc", "/ca-intermediate"],
    faqs: [
      { question: "What spaced repetition intervals does Kalnehi use?", answer: "Default intervals are: 1 day, 3 days, 7 days, 14 days, and 30 days after initial completion. For chapters marked 'Needs Revision,' intervals are shortened: 1 day, 2 days, 5 days, 10 days." },
      { question: "Can I customise the revision intervals?", answer: "Yes. The default intervals follow established learning science, but you can adjust them in settings if your exam timeline requires a different revision cadence (e.g., all chapters need a final revision 1 week before the exam)." },
      { question: "How do revision sessions appear in my daily plan?", answer: "Revisions due today automatically appear in your Kalnehi daily plan alongside your new learning tasks. The plan distinguishes between 'New Study' and 'Revision' sessions so you can plan your day accordingly." },
      { question: "What happens if I miss a scheduled revision?", answer: "Missed revisions are carried forward to the next day and flagged. PrepBrain AI also alerts you when revision backlog is accumulating — a sign that you need to slow down on new chapters and clear the revision queue." },
    ],
    metaDescription: "Kalnehi's Spaced Revision Engine schedules chapter reviews at 1-day, 3-day, 1-week, 2-week and 1-month intervals automatically. Built on learning science, connected to your syllabus tracker.",
  },
  {
    slug: "marks-engine",
    name: "Marks Engine",
    tagline: "Track Scores, Predict Rank",
    headline: "Marks Engine + Rank Prediction — Know Exactly Where You Stand Before Exam Day",
    description: `The Marks Engine is Kalnehi's scoring and rank prediction system. It does two things that most students never do systematically: track every mock test score across sessions, and predict where that score translates in actual exam rank.

Log your mock scores — overall and section-wise — and the Marks Engine builds a performance curve across your entire preparation. You see at a glance whether your scores are trending up, plateauing, or declining. PrepBrain AI reads this trend and tells you why.

For rank prediction, the Marks Engine uses normalisation models based on historical exam patterns. Enter your mock score and it estimates your likely percentile rank in the actual exam. For JEE Main, NEET UG, CAT, GATE, SSC CGL — the model is calibrated against published rank-score data from previous years.

The engine also shows your Target Score Blueprint: given your target college or rank, which chapters should you prioritise based on their marks contribution? This turns a vague target ("I want to crack JEE") into a specific chapter priority list.`,
    scenarios: [
      "A CAT aspirant has written 8 mocks. The Marks Engine shows their overall score is flat at 95-97 percentile for the last 5 mocks, but their DILR section is declining from 90th to 82nd percentile. PrepBrain reads this and says: 'DILR is your bottleneck. Your Quant and Verbal are stable. Shift 40% of prep time to DILR for the next 2 weeks.'",
      "A JEE Main aspirant scores 196/300 on a mock. The Marks Engine predicts a percentile band of 97.5-98.5 based on previous year normalisation data. They can see they're on track for their NIT target (needs 97+ percentile).",
      "A NEET aspirant's scores show Biology declining month-on-month. PrepBrain analyses the mock data and identifies: 'Your Ecology and Genetics scores dropped 15% over the last 3 tests. These are revision items — not new learning gaps.' It schedules focused Ecology and Genetics revision this week.",
      "An SSC CGL aspirant uses the Marks Engine to track sectional scores across 20 mocks. The engine shows Quantitative Aptitude is consistently 3-4 marks below their personal target. PrepBrain identifies the 5 QA topics with the most wrong answers and builds a targeted practice plan.",
    ],
    examCompatibility: "Marks Engine supports all major competitive exams: JEE Main/Advanced, NEET UG/PG, CAT, GATE, UPSC, SSC CGL/CHSL, IBPS PO/SBI PO, CLAT, NDA, GRE, SAT and CA exams. Each exam has its own scoring and percentile model.",
    relatedFeatures: ["prepbrain-ai", "syllabus-tracker", "consistency-tracker"],
    relatedExams: ["/jee", "/neet", "/cat", "/gate", "/ssc-cgl"],
    faqs: [
      { question: "How accurate is the rank prediction?", answer: "The rank prediction is an estimate based on historical score-rank relationships from previous exam years. It's useful for understanding your current readiness level, not as a guarantee. Actual rank depends on normalisation across all candidates that year." },
      { question: "Can I track marks for all my subjects separately?", answer: "Yes. Log sectional scores for each section of your exam — Physics/Chemistry/Maths for JEE, or QA/DILR/VARC for CAT. The engine tracks each section separately and PrepBrain analyses patterns at the section level." },
      { question: "What exams have rank prediction support?", answer: "JEE Main (percentile + rank estimate), NEET UG (AIR estimate), CAT (percentile estimate), GATE (score + rank estimate), SSC CGL (normalised score estimate). For other exams, you can track scores and PrepBrain analyses trends even without a formal rank model." },
      { question: "Can I compare my performance across different coaching institute mocks?", answer: "Yes. Log each mock with a source tag (ALLEN, FIITJEE, Resonance, etc.) and the engine shows your performance per source. This helps account for difficulty variation between coaching mocks." },
    ],
    metaDescription: "Kalnehi's Marks Engine tracks mock test scores across sessions and predicts your exam rank. Supports JEE, NEET, CAT, GATE, SSC and all major Indian competitive exams. PrepBrain reads your score data.",
  },
  {
    slug: "study-timer",
    name: "Study Timer",
    tagline: "Focus Blocks for Exam Prep",
    headline: "Study Timer — Deep Focus Blocks That Build Into Exam-Ready Stamina",
    description: `The Study Timer in Kalnehi is not just a countdown clock. It's a session tracker that logs your study time against specific chapters or subjects, connects to your syllabus tracker, and builds a historical record of where your hours actually went.

Use it for Pomodoro-style 25-minute blocks during intense problem-solving, or for 3-hour exam-simulation blocks that build the stamina you need to sit for JEE Advanced or UPSC Mains. Every timer session is labelled with what you studied and saved to your history.

The timer also integrates with Kalnehi's on-camera study feature — start a session with optional camera-on mode for self-accountability, with all processing done on-device.`,
    scenarios: [
      "A JEE aspirant sets a 90-minute timer for 'Electrostatics — problem practice.' At the end, the session is logged automatically to their study history. PrepBrain can see how many hours they've invested in Electrostatics total and whether it matches the chapter's difficulty level.",
      "A UPSC aspirant uses a 3-hour timer for answer writing practice — simulating the actual Mains paper environment. No phone, no breaks. The timer tracks their stamina development over weeks.",
      "A CA Intermediate student uses 25-minute Pomodoro blocks for Audit theory reading. After 4 blocks with 5-minute breaks, the session is complete — 2 hours of focused Audit work logged and attributed to the chapter they were studying.",
    ],
    examCompatibility: "Study Timer benefits all exams — Pomodoro blocks for daily study, long blocks for exam simulation. Most critical for UPSC Mains (3-hour answer writing stamina) and JEE Advanced (3-hour problem-solving endurance).",
    relatedFeatures: ["on-camera-study", "consistency-tracker", "daily-planner"],
    relatedExams: ["/jee", "/upsc", "/gate"],
    faqs: [
      { question: "Does the timer pause if I leave the app?", answer: "The timer runs in the background and continues when you return. If you close the app entirely, the timer pauses and you're prompted to resume or end the session when you return." },
      { question: "Can I see my total study hours per subject?", answer: "Yes. Your total study hours per subject are tracked in your Kalnehi dashboard. PrepBrain uses this data to identify subjects where you're under-investing time relative to their syllabus weight." },
      { question: "Is there a Pomodoro mode?", answer: "Yes. Enable Pomodoro mode for automatic 25-minute work / 5-minute break cycles. After 4 Pomodoros, a 15-minute long break is automatically suggested." },
    ],
    metaDescription: "Kalnehi's Study Timer tracks focus sessions against specific chapters and subjects, building a history of where your hours went. Supports Pomodoro and long exam-simulation blocks.",
  },
  {
    slug: "consistency-tracker",
    name: "Consistency Tracker",
    tagline: "Heatmap + Streaks for Serious Aspirants",
    headline: "Consistency Tracker — Your Daily Heatmap and Streak System",
    description: `The Consistency Tracker shows you the truth about your preparation — not how you felt about it, but what you actually did. A GitHub-style heatmap displays every day of your prep with colour intensity based on study hours logged. Green days. Grey days. It doesn't lie.

Streaks track your consecutive days of study. Breaking a streak costs more psychologically than you'd expect — and that's intentional. The consistency tracker gamifies the most important habit in exam preparation: showing up every single day.

For long-exam preps like UPSC (12-18 months) and CA (multiple-year journey), the heatmap becomes a visual record of your entire preparation. Toppers look back at months of dense green heatmaps. Failures have obvious grey patches. The heatmap predicts outcomes before exams do.`,
    scenarios: [
      "A UPSC aspirant reviews their heatmap after 6 months of preparation. They see a 3-week grey patch in March. PrepBrain reads the heatmap and says: 'Your output dropped significantly in March. Your exam is in 4 months and you're 18% behind your projected completion. Here's a recovery plan.'",
      "A JEE dropper commits to a 100-day streak before their exam. The Consistency Tracker shows their current streak (Day 67). Breaking it is not an option — the visual accountability of the streak keeps them going on days when motivation fails.",
      "A NEET aspirant's heatmap shows that Sundays are consistently grey (no study). PrepBrain identifies this pattern and suggests building a lighter Sunday routine — even 2 hours — to eliminate the pattern before it becomes a habit.",
    ],
    examCompatibility: "Consistency Tracker is most impactful for long-haul exams: UPSC (18 months), CA (multi-year), GATE (6 months), JEE/NEET drop year. The heatmap becomes a meaningful record over months of preparation.",
    relatedFeatures: ["daily-planner", "habit-maker", "study-timer"],
    relatedExams: ["/upsc", "/ca-final", "/jee", "/gate"],
    faqs: [
      { question: "What counts as a 'study day' for the streak and heatmap?", answer: "Any day where you log at least one completed task or study session in Kalnehi. The threshold is intentionally low — even a 30-minute session counts — because consistency matters more than volume on any given day." },
      { question: "Can I see my consistency data from previous weeks or months?", answer: "Yes. The heatmap shows your complete study history from the day you started. You can zoom to week, month, or full-history views." },
      { question: "What happens if I miss a day due to illness?", answer: "Your streak resets. There's no exception system — the consistency tracker reflects reality. However, you can add a note to any day explaining an absence, and PrepBrain won't penalise the gap in its analysis if you mark it as a planned rest day." },
    ],
    metaDescription: "Kalnehi's Consistency Tracker shows a GitHub-style heatmap of your daily study activity and tracks streaks. Built for long-haul exam prep: UPSC, CA, JEE droppers, and GATE.",
  },
  {
    slug: "doubt-tracker",
    name: "Doubt Tracker",
    tagline: "Capture and Resolve Every Unanswered Question",
    headline: "Doubt Tracker — Stop Letting Questions Slip. Capture, Tag, and Resolve Every Doubt.",
    description: `The Doubt Tracker is a Kanban-style system for managing your unanswered questions. When you encounter a concept you don't understand, a problem type you can't solve, or a question from a mock test you got wrong — instead of moving on and hoping you'll remember to review it later, you capture it in the Doubt Tracker.

Each doubt is tagged with the subject, chapter, and type (conceptual, calculation, memory, problem-type). Doubts move through stages: Logged → Researched → Resolved. You can tag doubts from your study sessions, voice log them with "Hey Boss, log a doubt," or add them after a mock test review.

PrepBrain reads your doubt tracker and identifies patterns — if you have 12 doubts tagged under Organic Chemistry Mechanisms, PrepBrain flags this as a systematic gap, not individual questions. It then recommends targeted practice for that specific area.

Students who resolve their doubts systematically consistently outperform those who let questions accumulate. The doubt tracker makes the difference visible.`,
    scenarios: [
      "A GATE aspirant finishes a practice set on Operating Systems and has 3 questions they got wrong but don't understand why. Instead of moving on, they log 3 doubts with voice: 'Hey Boss, log a doubt — OS, Process Scheduling, I confuse preemptive vs non-preemptive in SJF.' All 3 are captured for later resolution.",
      "A JEE aspirant opens their doubt tracker before a coaching class and sees 8 unresolved doubts in Physical Chemistry. They bring these doubts to the class instead of sitting passively. All 8 get resolved in one session.",
      "PrepBrain reads a NEET aspirant's doubt tracker and flags: 'You have 15 doubts in Genetics and 11 in Molecular Biology. This is a systematic gap — not random. You need 3 focused hours on the Central Dogma and Mendelian ratios to clear this cluster.'",
    ],
    examCompatibility: "Doubt Tracker benefits all exams, but is especially critical for problem-solving exams: JEE (Physics + Maths doubts accumulate fast), GATE (technical depth creates systematic gaps), CA (Accounting Standards are complex and interconnected).",
    relatedFeatures: ["prepbrain-ai", "daily-planner", "voice-control"],
    relatedExams: ["/jee", "/gate", "/ca-intermediate", "/neet"],
    faqs: [
      { question: "Can I photograph a question and add it to my Doubt Tracker?", answer: "Yes. You can attach images to doubts — photograph the question from your textbook or coaching material and attach it to the doubt entry for context." },
      { question: "How does PrepBrain use my Doubt Tracker data?", answer: "PrepBrain analyses your doubts for patterns — if multiple doubts cluster around the same chapter or concept type, it identifies a systematic gap and recommends targeted practice. It also counts unresolved doubts in its readiness assessment." },
      { question: "Can I share doubts with my tutor or study group?", answer: "You can export your doubt list as text to share via WhatsApp or any messaging app. Kalnehi doesn't have built-in social features, but sharing is easy through export." },
    ],
    metaDescription: "Kalnehi's Doubt Tracker uses Kanban stages to capture, tag and resolve study doubts. PrepBrain reads your doubt patterns and identifies systematic gaps in JEE, NEET, GATE and all major exams.",
  },
  {
    slug: "daily-planner",
    name: "Daily Planner",
    tagline: "Manual + Voice Planning for Your Whole Day",
    headline: "Daily Planner — Plan Every Study Hour the Night Before, Execute All Day",
    description: `The Daily Planner is the execution core of Kalnehi. Every night you plan tomorrow's study sessions — which chapters, how many hours, what type of work (new learning, revision, problem practice, mock test). The next morning you execute and check off.

The planner supports both manual entry and voice dictation. Speak your entire day's plan in 2 minutes with "Hey Boss, dictate my day." The planner also accepts PrepBrain's recommendations — ask PrepBrain to plan your day and its suggestions appear directly in your daily task list.

Tasks in the daily planner connect to your syllabus tracker — when you check off a study task for a chapter, the chapter's status can update automatically. The planner also shows your "Master Today" circle — a circular progress indicator that fills as you complete tasks, giving you a visual representation of the day's execution.

Historical daily plans are saved and accessible — you can look back at what you did on any day over the past year, with completion percentages and task details.`,
    scenarios: [
      "The night before a heavy study day, a JEE aspirant opens the Daily Planner and adds: '07:00 — Physics: Electrostatics (2 hours), 09:30 — Chemistry: Equilibrium (1.5 hours), 11:00 — Coaching, 16:00 — Maths: Integration problem set (2 hours), 18:30 — Revision: Kinematics (30 min).' The plan is set. Tomorrow is already structured.",
      "A UPSC aspirant says 'Hey Boss, dictate my day' at 5:30 AM and speaks their entire plan in 90 seconds: Current affairs at 6, GS2 Polity from 7-10, coaching notes review 10-11, answer writing practice 11-1, NCERT Economy 3-5, essay practice 6-7. The planner captures all of it hands-free.",
      "An aspirant completes 6 out of 8 planned tasks at 9 PM. Their Master Today circle is at 75%. PrepBrain says: 'You have 2 tasks left. Given your energy at this hour, complete the 20-minute revision task tonight and defer the 2-hour Organic Chemistry to tomorrow morning.'",
    ],
    examCompatibility: "Daily Planner is the foundation of Kalnehi for all exams. Especially critical for high-volume exams with complex daily scheduling: UPSC (multiple subjects + current affairs), JEE/NEET (3-subject balance), CA (8-paper management).",
    relatedFeatures: ["voice-control", "prepbrain-ai", "consistency-tracker"],
    relatedExams: ["/jee", "/neet", "/upsc", "/ca-final"],
    faqs: [
      { question: "Can I set recurring tasks in the Daily Planner?", answer: "Yes. Set recurring daily tasks for things like 'Read newspaper' or '20-minute revision.' These automatically appear in your plan each day until you modify or remove them." },
      { question: "Does the Daily Planner integrate with the syllabus tracker?", answer: "Yes. When you complete a task tagged to a chapter (e.g., 'Electrostatics — first reading'), you can update the chapter status in your syllabus tracker directly from the task completion action." },
      { question: "Can I carry forward incomplete tasks?", answer: "Yes. Incomplete tasks can be carried forward to the next day with one tap. They appear at the top of tomorrow's plan clearly marked as carried-over." },
    ],
    metaDescription: "Kalnehi's Daily Planner lets you plan every study hour by voice or manually, track tasks to completion, and connect each session to your syllabus tracker. Built for JEE, NEET, UPSC and all major exams.",
  },
  {
    slug: "on-camera-study",
    name: "On-Camera Study",
    tagline: "Study with a Camera On. Zero Upload.",
    headline: "On-Camera Study — Accountability Camera That Never Leaves Your Device",
    description: `On-Camera Study sessions let you study with your front camera active for self-monitoring — detecting whether you're at your desk, focused, or distracted — without ever uploading your video to any server. All processing is on-device using MediaPipe, a privacy-respecting AI framework that runs locally.

The camera detects basic focus signals: whether you're at the desk, whether your attention appears directed at the screen. It doesn't record video. It doesn't store images. It doesn't send anything to the cloud. The only thing that happens in Kalnehi is: focus signals are logged as session quality indicators.

This is for aspirants who want the accountability of a study partner watching them, without sharing a room or a video call. It's also useful for on-camera study sessions with a self-imposed rule: if you leave the frame, the timer pauses.`,
    scenarios: [
      "A JEE aspirant studying alone at home uses On-Camera Study for their 3-hour morning session. If they pick up their phone and leave the camera frame, the session timer pauses automatically — a gentle nudge to stay on task.",
      "A NEET aspirant uses On-Camera Study during revision sessions to maintain the discipline of a library environment even while studying at home. The camera-on mode creates the feeling of being watched, which research shows improves focus.",
      "A GATE aspirant uses the session quality score — calculated from their on-camera focus signals — to compare their Monday vs Friday sessions. They discover Friday sessions have significantly lower focus scores and adjust their study schedule accordingly.",
    ],
    examCompatibility: "On-Camera Study works for all exams and is most useful for aspirants who study at home without external accountability — drop year JEE/NEET students, home-based UPSC preparation, remote CA students.",
    relatedFeatures: ["study-timer", "consistency-tracker", "daily-planner"],
    relatedExams: ["/jee", "/neet", "/upsc"],
    faqs: [
      { question: "Is video recorded or uploaded anywhere?", answer: "Never. On-Camera Study runs entirely on your device using on-device AI (MediaPipe). No video is recorded, no images are stored, nothing leaves your device. Kalnehi only logs abstract focus signals (e.g., 'attention detected: yes/no') from the session." },
      { question: "What camera permission is needed?", answer: "Kalnehi requests camera permission only when you start an On-Camera Study session. You can revoke this permission at any time in your device settings." },
      { question: "What happens if I cover the camera?", answer: "The session continues with a 'Camera covered' status. The focus signal is logged as unavailable for that period. You can choose to end the session or continue without camera monitoring." },
    ],
    metaDescription: "Kalnehi's On-Camera Study uses on-device AI (no video upload) to monitor study focus. All processing stays on your device. Never uploaded, never recorded. Built for privacy-first exam preparation.",
  },
  {
    slug: "habit-maker",
    name: "Habit Maker",
    tagline: "Build the Non-Negotiables of Exam Prep",
    headline: "Habit Maker — Build the Non-Negotiable Daily Habits That Compound Into Rank",
    description: `Habits are the invisible scaffolding of exam preparation. The student who reads the newspaper every morning without thinking about it has a massive advantage in UPSC by November. The JEE student who opens NCERT for 30 minutes every night without motivation depleting doesn't need willpower — the habit does the work.

Kalnehi's Habit Maker lets you create exam-specific habits with custom reminders, streaks, and check-in systems. Create habits like: Read The Hindu at 6 AM, Review 10 flashcards before sleep, 20-minute NCERT reading, Write 1 answer every day, Review previous day's notes.

Each habit has its own streak counter. Breaking a habit streak is logged and visible. PrepBrain reads your habit completion data and factors it into its strategy — a student who has been meditating daily for 30 days has better cognitive baseline than one who hasn't.`,
    scenarios: [
      "A UPSC aspirant sets up 5 daily habits: Read The Hindu (6 AM), Review yesterday's notes (8 AM), 1 answer writing (12 PM), PIB summary (7 PM), Review tomorrow's plan (10 PM). All 5 are tracked with streaks. After 30 days, they have 30-day streaks on all 5 — the prep backbone is solid.",
      "A JEE aspirant builds a 15-minute flashcard review habit every night before sleep for formula review. At 90 days, they've reviewed their formula sheets 90 times. By JEE Main, every formula is automatic.",
      "A NEET aspirant sets up a daily 'Biology diagram practice' habit for 20 minutes every morning. PrepBrain reads the 60-day streak and notes: 'You've maintained daily Biology diagram practice for 2 months. This is likely why your Biology visual question accuracy has improved 18% in the last 3 mocks.'",
    ],
    examCompatibility: "Habit Maker is essential for UPSC (daily newspaper, answer writing), NEET/JEE (formula review, NCERT reading), CA (daily practice questions), and all long-duration exam preps where consistency habits are the foundation.",
    relatedFeatures: ["consistency-tracker", "daily-planner", "prepbrain-ai"],
    relatedExams: ["/upsc", "/neet", "/jee", "/ca-intermediate"],
    faqs: [
      { question: "How many habits can I create?", answer: "No fixed limit. However, PrepBrain will flag if you have more than 8-10 active habits — too many habits reduce completion rates and create guilt rather than momentum." },
      { question: "Can I set different habits for different days?", answer: "Yes. Set habits as daily, weekday-only, weekend-only, or specific days of the week. For example, 'Mock test — Sundays only' or 'Answer writing — Mon, Wed, Fri.'" },
      { question: "What reminders are available?", answer: "Push notifications at a set time each day, with customisable message. You can set a morning nudge ('Time for your newspaper'), a midday check-in ('Have you written your answer today?'), and an evening reminder." },
    ],
    metaDescription: "Kalnehi's Habit Maker builds exam-specific daily habits with streaks, reminders and PrepBrain AI monitoring. Create the non-negotiable routines that separate UPSC, JEE and NEET toppers.",
  },
  {
    slug: "daily-log",
    name: "Daily Log",
    tagline: "A Private Record of Every Study Day",
    headline: "Daily Log — Your Honest Record of Every Study Day",
    description: `The Daily Log is Kalnehi's journal for serious aspirants. Every day, log what you studied, for how long, what felt difficult, what went well, and any notes you want to remember. It's a private, searchable record of your entire preparation journey.

The daily log is not just a diary. PrepBrain reads your log entries — especially your difficulty notes and emotional state indicators — to understand your preparation quality, not just quantity. A day where you logged 8 hours but noted "couldn't focus, kept re-reading the same paragraph" is different from a day with 4 hours logged and "clicked — finally understood circular motion."

Over months, the daily log becomes your most honest preparation data. You can search back to any date, review what you covered, and use it to avoid repeating past mistakes.`,
    scenarios: [
      "Before a UPSC mock exam, a student searches their daily log for 'Polity' and reviews every entry where they logged Polity study. They see which chapters they found difficult 3 months ago and whether they've since resolved those difficulties.",
      "After a disappointing JEE mock score, a JEE aspirant reads their daily logs for the past 2 weeks. They notice they logged 'distracted, couldn't concentrate' on 6 out of 14 days — a pattern PrepBrain flags as study environment or sleep quality issue.",
      "A GATE aspirant uses the daily log to note after each study session: which GATE topics they covered, which PYQs they solved, and which problem types they struggled with. After 3 months, they have a detailed record of their entire preparation journey.",
    ],
    examCompatibility: "Daily Log is valuable for all exams. Especially useful for UPSC aspirants (long-term journey tracking), JEE/NEET drop year (learning from previous year mistakes), and CA students (tracking exam attempts and preparation quality across multiple attempts).",
    relatedFeatures: ["daily-planner", "consistency-tracker", "prepbrain-ai"],
    relatedExams: ["/upsc", "/jee", "/gate"],
    faqs: [
      { question: "Is the daily log searchable?", answer: "Yes. Full-text search across all your log entries. Search for any topic, chapter name, or keyword and see all dates where you logged that content." },
      { question: "Can I add photos to my daily log?", answer: "Yes. Attach photos of your notes, solved problems, or anything you want to preserve as part of the day's record." },
      { question: "Is my daily log private?", answer: "Completely private. Your daily log is stored encrypted and accessible only to you. PrepBrain can read it for analysis, but it's never shared with anyone else." },
    ],
    metaDescription: "Kalnehi's Daily Log is a searchable private record of every study day — what you covered, how you felt, what was difficult. PrepBrain reads logs to track preparation quality, not just hours.",
  },
];

export function getAllFeatures(): FeatureData[] {
  return FEATURES;
}

export function getFeatureBySlug(slug: string): FeatureData | undefined {
  return FEATURES.find((f) => f.slug === slug);
}

export function getFeatureSlugs(): string[] {
  return FEATURES.map((f) => f.slug);
}
