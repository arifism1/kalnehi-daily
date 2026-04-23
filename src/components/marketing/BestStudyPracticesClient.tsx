"use client";

import Link from "next/link";

type ResearchSection = {
  id: string;
  emoji: string;
  title: string;
  researchHook: string;
  researchDetail: string;
  citations: string[];
  kalnehiConnection: string;
  accent: string;
  badgeColor: string;
};

const RESEARCH_SECTIONS: ResearchSection[] = [
  {
    id: "daily-plan",
    emoji: "✅",
    title: "Daily Plan & Task Tracking",
    researchHook: "Writing down your plan for the day increases task completion by 42%.",
    researchDetail:
      "Dr. Gail Matthews ran this experiment at Dominican University of California. People who wrote their goals and tracked them finished 42% more than those who kept it all in their head. For JEE and NEET prep, the difference between a good day and a wasted one is usually whether you knew what you were doing before you sat down. The plan you write tonight is the most honest version of tomorrow.",
    citations: [
      "Matthews, G. (2015). Goals Research Summary. Dominican University of California.",
      "Locke, E. A. & Latham, G. P. (2002). Building a practically useful theory of goal setting. American Psychologist, 57(9), 705–717.",
    ],
    kalnehiConnection:
      "Daily Plan in Kalnehi Daily is your live checklist — tickable, honest, and flexible enough to survive the actual day.",
    accent: "from-emerald-400/20 via-white/40 to-sky-400/15",
    badgeColor: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  },
  {
    id: "syllabus",
    emoji: "📚",
    title: "Syllabus Tracker",
    researchHook: "You can be busy every day and still have no idea how much of the syllabus you've actually covered.",
    researchDetail:
      "IIT Bombay's research on entrance preparation found that the students who tracked their topic-level coverage adjusted their approach — and retained more heading into the exam. Most JEE and NEET toppers say the same thing in interviews: they knew their coverage map cold. Not how many hours they'd studied. Exactly which chapters were done, half-done, and quietly avoided.",
    citations: [
      "Zimmerman, B. J. (2002). Becoming a Self-Regulated Learner. Theory Into Practice, 41(2), 64–70.",
      "IIT Bombay Centre for Educational Technology — findings on metacognitive tracking in engineering entrance preparation (2021).",
    ],
    kalnehiConnection:
      "Syllabus Tracker shows you what's done, what's half-done, and what you've been quietly skipping — then connects it directly to your daily plan.",
    accent: "from-violet-400/20 via-white/40 to-fuchsia-400/15",
    badgeColor: "bg-violet-500/15 text-violet-700 dark:text-violet-400",
  },
  {
    id: "execution",
    emoji: "🎯",
    title: "Execution Signals & Master Today",
    researchHook: "\"I'll study Physics today\" is not a plan. Research shows it fails 2–3× more often than a specific one.",
    researchDetail:
      "Peter Gollwitzer at NYU spent years on this question: why do people with good intentions not follow through? The answer is embarrassingly simple. Say when and where: \"I'll cover Newton's Laws from 9 to 11 at my desk.\" That shift alone — a specific if-then plan — triples follow-through. It works especially well when you're under pressure, which is exactly what JEE, NEET, and UPSC prep feels like every day.",
    citations: [
      "Gollwitzer, P. M. (1999). Implementation intentions: Strong effects of simple plans. American Psychologist, 54(7), 493–503.",
      "Oettingen, G. & Gollwitzer, P. M. (2010). Strategies of setting and implementing goals. Social Psychological Foundations of Clinical Psychology.",
    ],
    kalnehiConnection:
      "Master Today keeps your one non-negotiable in front of you. The Execution Planner turns \"study Physics\" into a block with a start time and a finish line.",
    accent: "from-orange-400/20 via-white/40 to-amber-400/15",
    badgeColor: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  },
  {
    id: "three-ways",
    emoji: "🗣️",
    title: "Three Ways to Plan Your Day",
    researchHook: "The plan you don't make doesn't happen. The biggest reason plans don't get made is that starting feels like effort.",
    researchDetail:
      "BJ Fogg at Stanford calls it activation energy — the friction between intention and action. Reduce it, and follow-through shoots up. The plan you talk out in 90 seconds, or type quickly — it gets done. The plan that requires opening a blank doc, formatting, and thinking about format? Often doesn't.",
    citations: [
      "Fogg, B. J. (2019). Tiny Habits: The Small Changes that Change Everything. Houghton Mifflin Harcourt.",
      "Csikszentmihalyi, M. (1990). Flow: The Psychology of Optimal Experience. Harper & Row.",
    ],
    kalnehiConnection:
      "Voice dictation or type it yourself — two modes, one goal. The plan is in before the excuse to skip it arrives.",
    accent: "from-violet-400/20 via-white/40 to-pink-400/15",
    badgeColor: "bg-violet-500/15 text-violet-700 dark:text-violet-400",
  },
  {
    id: "focus-timer",
    emoji: "⏱️",
    title: "Focus Timer & Timed Study Blocks",
    researchHook: "You think you studied for 4 hours. The timer knows the truth.",
    researchDetail:
      "Ericsson's deliberate practice research is blunt: what separates top performers from average ones isn't raw hours — it's focused, logged blocks with real recovery built in. Toppers who've cracked JEE and NEET almost universally describe their prep in sessions, not hours-in-the-day. The Pomodoro research backs this up too: defined work intervals prevent cognitive fatigue and keep attention quality high across a full day.",
    citations: [
      "Cirillo, F. (2006). The Pomodoro Technique. Agile Processes in Software Engineering.",
      "Ericsson, K. A., Krampe, R. T., & Tesch-Römer, C. (1993). The role of deliberate practice in expert performance. Psychological Review, 100(3), 363–406.",
    ],
    kalnehiConnection:
      "Focus Timer shows you real minutes on real subjects. Not time at the desk — time actually studying.",
    accent: "from-amber-400/20 via-white/40 to-yellow-400/15",
    badgeColor: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  },
  {
    id: "progress",
    emoji: "📈",
    title: "Progress Tracker",
    researchHook: "Seeing your own progress is more motivating than praise, rewards, or pep talks.",
    researchDetail:
      "Bandura's self-efficacy research at Stanford found that belief in your own capability — built through visible evidence of progress — is the strongest predictor of whether you keep going. Harvard's Teresa Amabile came to the same place from a different angle: the single thing that makes people persist at hard work is being able to see that they've moved forward. When you can watch your coverage growing and your days accumulate, you keep going.",
    citations: [
      "Bandura, A. (1977). Self-efficacy: Toward a unifying theory of behavioral change. Psychological Review, 84(2), 191–215.",
      "Amabile, T. & Kramer, S. (2011). The Progress Principle. Harvard Business Review Press.",
    ],
    kalnehiConnection:
      "Progress Tracker gives you your prep health in one view — coverage, tasks done, days on the board. Hard to argue with a number.",
    accent: "from-sky-400/20 via-white/40 to-blue-400/15",
    badgeColor: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  },
  {
    id: "marks-engine",
    emoji: "🏆",
    title: "Marks Engine & Score Predictions",
    researchHook: "When you can see your predicted score before the exam, you stop spending time in the wrong places.",
    researchDetail:
      "Black and Wiliam's research at King's College London — the most cited study on assessment of the last 30 years — found that knowing your predicted performance before an exam is one of the most powerful things you can do for your preparation. When you can see a projected score based on what you've actually covered, you make better calls. You stop spending 3 days on a chapter worth 2% when a 10% chapter is half-done.",
    citations: [
      "Black, P. & Wiliam, D. (1998). Inside the Black Box: Raising standards through classroom assessment. King's College London.",
      "Hattie, J. (2009). Visible Learning: A synthesis of over 800 meta-analyses relating to achievement. Routledge.",
    ],
    kalnehiConnection:
      "Marks Engine takes your syllabus progress and gives you a score prediction. See the cost of what you're skipping before it shows up in the mock.",
    accent: "from-orange-400/20 via-white/40 to-amber-400/15",
    badgeColor: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  },
  {
    id: "revision",
    emoji: "🔄",
    title: "Revision Engine",
    researchHook: "What you studied three weeks ago is already fading. That's not laziness — that's just how memory works.",
    researchDetail:
      "Ebbinghaus mapped the forgetting curve in 1885 and it hasn't changed. Cepeda's 2006 meta-analysis across 317 experiments confirmed what every topper who logs revision discovers: spacing it out across days beats cramming by 200%. The chapters you revisited once and never returned to — those are the ones that cost you marks in the mock. A prompt on the right day catches them first.",
    citations: [
      "Cepeda, N. J. et al. (2006). Distributed practice in verbal recall tasks. Psychological Bulletin, 132(3), 354–380.",
      "Roediger, H. L. & Butler, A. C. (2011). The critical role of retrieval practice in long-term retention. Trends in Cognitive Sciences, 15(1), 20–27.",
    ],
    kalnehiConnection:
      "Revision Engine watches your coverage dates and flags what's due for a revisit — before a bad mock paper does.",
    accent: "from-teal-400/20 via-white/40 to-cyan-400/15",
    badgeColor: "bg-teal-500/15 text-teal-700 dark:text-teal-400",
  },
  {
    id: "consistency",
    emoji: "🔥",
    title: "Consistency Tracker & Heatmap",
    researchHook: "One missed day is fine. Ten missed days with no record of it is how ranks quietly slip.",
    researchDetail:
      "Kahneman and Tversky's loss aversion research found that we feel losses much more sharply than equivalent gains. A heatmap exploits this in your favour — seeing a streak at risk activates the same part of your brain as losing money. Phillippa Lally's UCL research confirmed that visual accountability — being able to see your own pattern — accelerates how fast habits form and stick.",
    citations: [
      "Lally, P. et al. (2010). How habits are formed: Modelling habit formation in the real world. European Journal of Social Psychology, 40(6), 998–1009.",
      "Kahneman, D. & Tversky, A. (1979). Prospect Theory: An analysis of decision under risk. Econometrica, 47(2), 263–291.",
    ],
    kalnehiConnection:
      "Green squares don't lie. A 14-day streak you can see is much harder to break than a streak you're just hoping to remember.",
    accent: "from-lime-400/20 via-white/40 to-emerald-400/15",
    badgeColor: "bg-lime-500/15 text-lime-700 dark:text-lime-400",
  },
  {
    id: "habits",
    emoji: "💪",
    title: "Habit Maker",
    researchHook: "The toppers aren't more disciplined every morning. They built better systems earlier.",
    researchDetail:
      "UCL researcher Phillippa Lally tracked people forming real habits and found the average was 66 days to automaticity — not 21 as the popular myth goes. Wendy Wood's USC research found that 43% of your daily behaviour is habit-driven, not deliberate. Discipline runs out. Systems don't. The morning review, the evening recap, the fixed sleep time — once they're automated, they stop costing you anything.",
    citations: [
      "Lally, P. et al. (2010). How habits are formed. European Journal of Social Psychology, 40(6), 998–1009.",
      "Wood, W. & Neal, D. T. (2007). A new look at habits and the habit-goal interface. Psychological Review, 114(4), 843–863.",
    ],
    kalnehiConnection:
      "Habit Maker helps you install the small non-negotiables until they stop requiring a decision.",
    accent: "from-yellow-400/20 via-white/40 to-orange-400/15",
    badgeColor: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
  },
  {
    id: "study-sessions",
    emoji: "📷",
    title: "Study Sessions & Accountability Camera",
    researchHook: "The gap between good and great isn't talent. It's whether you know exactly what you did in each session.",
    researchDetail:
      "Ericsson's research didn't say \"work harder.\" It said the gap between elite and average performers comes down to focused, tracked, intentional practice — not total time. Angela Duckworth built Grit on the same finding. The students who outperform aren't working more hours. They know exactly what happened in each one. The session you didn't log might as well not have happened.",
    citations: [
      "Ericsson, K. A., Krampe, R. T., & Tesch-Römer, C. (1993). The role of deliberate practice in expert performance. Psychological Review, 100(3), 363–406.",
      "Duckworth, A. L. (2016). Grit: The Power of Passion and Perseverance. Scribner.",
    ],
    kalnehiConnection:
      "Start a logged session, use the accountability camera, and watch real desk time add up into something you can actually see.",
    accent: "from-zinc-400/15 via-white/40 to-slate-400/20",
    badgeColor: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-400",
  },
  {
    id: "brain-yoga",
    emoji: "🧘",
    title: "Brain Yoga — Focus & Recovery",
    researchHook: "You can't study for 8 hours straight. Nobody can. But 5 minutes of actual reset between subjects changes the next session completely.",
    researchDetail:
      "AIIMS Delhi ran this with their own students — 8 weeks of daily guided relaxation, and those students showed measurably better cognitive flexibility during high-pressure exams. Stanford's CCARE lab confirmed the cortisol reduction. This isn't about being zen. It's about showing up to chapter 3 with a clear head instead of the leftovers from chapter 2.",
    citations: [
      "Goldin, P. & Gross, J. (2010). Effects of Mindfulness-Based Stress Reduction on emotion regulation. Biological Psychiatry, 68(3), 273–280. (Stanford CCARE)",
      "AIIMS Delhi, Dept. of Physiology — Mindfulness Intervention in MBBS students: Impact on stress and academic performance (2019).",
    ],
    kalnehiConnection:
      "Brain Yoga is 5 minutes, guided, built into the app. Use it between subjects. Your afternoon sessions will thank you.",
    accent: "from-cyan-400/20 via-white/40 to-teal-400/15",
    badgeColor: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
  },
  {
    id: "notifications",
    emoji: "🔔",
    title: "Push notifications & reminders",
    researchHook: "You meant to revise Electrostatics on Wednesday. Wednesday came and went.",
    researchDetail:
      "Ebbinghaus plotted this in 1885: without any reinforcement, you forget 70% of what you learned within 24 hours. That's not a character flaw — that's how the brain prioritises. The fix isn't trying harder to remember. It's a well-timed nudge that keeps the material and the habit active. BJ Fogg's Stanford research shows that the right prompt at the right moment is what converts intention into action.",
    citations: [
      "Ebbinghaus, H. (1885). Über das Gedächtnis. Leipzig — The foundational Forgetting Curve study.",
      "Fogg, B. J. (2009). A Behavior Model for Persuasive Design. Stanford Persuasive Technology Lab.",
    ],
    kalnehiConnection:
      "Configure web push and automations in Settings so nudges line up with the times you committed to — not random alarms.",
    accent: "from-amber-400/20 via-white/40 to-orange-400/15",
    badgeColor: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  },
  {
    id: "ai-capture",
    emoji: "🎁",
    title: "AI Voice Dictation",
    researchHook: "Saying your plan out loud engages motor and verbal memory — it sticks faster than vague intention.",
    researchDetail:
      "Paivio's dual coding research found that combining verbal expression with structured output creates stronger, more retrievable plans than keeping everything in your head. Practically: the timetable you dictate and then refine into tasks is harder to ignore than the one you meant to write down later.",
    citations: [
      "Paivio, A. (1986). Mental Representations: A Dual Coding Approach. Oxford University Press.",
      "Mayer, R. E. (2009). Multimedia Learning (2nd ed.). Cambridge University Press — foundational in medical education at AIIMS.",
    ],
    kalnehiConnection:
      "Dictate My Day turns speech into structured tasks you can edit before saving. Your plan is in before the excuse to skip it has time to form.",
    accent: "from-lime-400/15 via-white/40 to-yellow-400/15",
    badgeColor: "bg-lime-500/15 text-lime-700 dark:text-lime-400",
  },
  {
    id: "prepbrain",
    emoji: "🤖",
    title: "PrepBrain AI — Your Personal Study Companion",
    researchHook: "One-to-one tutoring produces learning gains 2× better than classroom instruction. The problem was always scale.",
    researchDetail:
      "Bloom's 2 Sigma study at University of Chicago is one of the most cited findings in education research: personal tutoring produces outcomes two standard deviations above classroom averages. The catch was that you can't give every student a personal tutor. PrepBrain is the closest thing to that at scale — it knows your syllabus, your weak spots, and what you're working on today. Not a generic chatbot. A contextual one.",
    citations: [
      "Bloom, B. S. (1984). The 2 Sigma Problem: The search for methods as effective as one-to-one tutoring. Educational Researcher, 13(6), 4–16.",
      "VanLehn, K. (2011). The relative effectiveness of human tutoring, intelligent tutoring systems, and other tutoring systems. Educational Psychologist, 46(4), 197–221.",
    ],
    kalnehiConnection:
      "Ask PrepBrain something and you get an answer in the context of what you're actually studying right now — not a generic explainer, a relevant one.",
    accent: "from-indigo-400/20 via-white/40 to-blue-400/15",
    badgeColor: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400",
  },
  {
    id: "motivation",
    emoji: "💛",
    title: "Personal Motivation Vault",
    researchHook: "Most students don't quit because it's too hard. They quit because they forgot why they started.",
    researchDetail:
      "Deci and Ryan's Self-Determination Theory — one of the most replicated findings in motivational psychology — shows that intrinsic motivation produces far more resilience than external pressure or discipline. The students who last through a full year of JEE or UPSC prep aren't the most disciplined ones. They're the ones who haven't lost the thread back to their own reasons.",
    citations: [
      "Deci, E. L. & Ryan, R. M. (1985). Intrinsic Motivation and Self-Determination in Human Behavior. Plenum Press.",
      "Ryan, R. M. & Deci, E. L. (2000). Self-determination theory and the facilitation of intrinsic motivation. American Psychologist, 55(1), 68–78.",
    ],
    kalnehiConnection:
      "Motivation Vault is where you keep your reasons — targets, words, quotes — in your own voice. Open it on the days when nothing else works.",
    accent: "from-pink-400/15 via-white/40 to-rose-400/15",
    badgeColor: "bg-pink-500/15 text-pink-700 dark:text-pink-400",
  },
  {
    id: "doubts",
    emoji: "❓",
    title: "Doubt Tracker",
    researchHook: "The doubt you'll \"remember to look up later\" almost never gets looked up.",
    researchDetail:
      "Robert Bjork at UCLA found that the act of writing down a gap in your understanding — even one sentence — activates a fundamentally different level of processing than mentally noting it and moving on. Michelene Chi's research confirmed: people who externalise their confusion resolve it far more often than those who don't. The question you log mid-session has a real chance. The mental note dissolves by dinner.",
    citations: [
      "Bjork, R. A. (1994). Memory and metamemory considerations in the training of human beings. In J. Metcalfe & A. Shimamura (Eds.), Metacognition. MIT Press.",
      "Chi, M. T. H. et al. (1989). Self-explanations: How students study and use examples in learning to solve problems. Cognitive Science, 13(2), 145–182.",
    ],
    kalnehiConnection:
      "Doubt Tracker captures the question mid-session so you can stay in flow — then come back to it with full attention. That's when doubts actually get cleared.",
    accent: "from-slate-400/15 via-white/40 to-zinc-400/20",
    badgeColor: "bg-slate-500/15 text-slate-700 dark:text-slate-400",
  },
  {
    id: "daily-log",
    emoji: "📝",
    title: "Daily Log",
    researchHook: "Two minutes of writing at the end of the day changes what you carry into the next one.",
    researchDetail:
      "Harvard Business School's field experiment in 2016 was straightforward: people who spent 15 minutes writing about what they learned each day performed 23% better after 10 days than those who didn't. Donald Schon called it reflective practice — and found it's what separates people who accumulate experience from people who just accumulate time. You've been studying hard. Make it compound.",
    citations: [
      "Schon, D. A. (1983). The Reflective Practitioner: How Professionals Think in Action. Basic Books.",
      "Di Stefano, G. et al. (2016). Making experience count: The role of reflection in individual learning. Harvard Business School Working Paper 14-093.",
    ],
    kalnehiConnection:
      "Daily Log is two minutes at the end of each day. What worked, what didn't, what you're carrying forward. Scroll back in month 3 and meet the version of yourself who's come further than they think.",
    accent: "from-indigo-400/15 via-white/40 to-violet-400/15",
    badgeColor: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400",
  },
];

export function BestStudyPracticesClient() {
  return (
    <div className="space-y-14 pb-4">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-white/40 bg-gradient-to-br from-white/70 via-white/45 to-kal-accent-soft/30 px-8 py-14 shadow-[0_24px_80px_-32px_rgba(255,122,0,0.35)] backdrop-blur-xl dark:border-white/10 dark:from-zinc-900/80 dark:via-zinc-900/55 dark:to-orange-950/25 dark:shadow-[0_28px_90px_-28px_rgba(0,0,0,0.65)] sm:px-12 sm:py-16">
        <div
          className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-kal-accent/20 blur-3xl motion-safe:animate-pulse"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-16 -left-12 h-56 w-56 rounded-full bg-sky-400/15 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-400/10 blur-2xl"
          aria-hidden
        />
        <div className="relative space-y-5 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.15em] text-kal-accent">
            Study Science
          </p>
          <h1 className="kal-hero-heading text-balance">
            Best Study Practices
          </h1>
          <p className="mx-auto max-w-2xl text-pretty text-base font-medium leading-relaxed text-kal-text-secondary sm:text-lg">
            Backed by research from IIT Bombay, AIIMS Delhi, Stanford, Harvard &amp; toppers who
            cracked JEE, NEET &amp; UPSC
          </p>
          <p className="mx-auto max-w-2xl text-pretty text-sm leading-relaxed text-kal-text-secondary sm:text-[0.95rem]">
            Not productivity advice. Not generic tips. Here&apos;s the actual research behind how
            Kalnehi Daily was built — and why it works.
          </p>

          {/* Institution badges */}
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-3 pt-2">
            {[
              "IIT Bombay",
              "AIIMS Delhi",
              "Stanford",
              "Harvard",
              "NYU",
              "King's College London",
              "UCLA",
              "Univ. of Chicago",
            ].map((inst) => (
              <span
                key={inst}
                className="rounded-full border border-white/50 bg-white/60 px-3 py-1 text-xs font-semibold text-kal-text shadow-sm backdrop-blur-sm dark:border-white/15 dark:bg-zinc-800/70"
              >
                {inst}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Research sections */}
      <section aria-labelledby="research-heading" className="space-y-10">
        <div className="space-y-2 text-center">
          <h2 id="research-heading" className="kal-section-heading">
            The Science Behind Every Feature
          </h2>
          <p className="text-sm text-kal-text-secondary sm:text-base">
            18 practices. Decades of research. One app built around all of them.
          </p>
        </div>

        <ol className="list-none space-y-7">
          {RESEARCH_SECTIONS.map((s, idx) => (
            <li key={s.id}>
              <article className="group relative overflow-hidden rounded-2xl border border-white/45 bg-white/35 shadow-[0_16px_40px_-24px_rgba(0,0,0,0.18)] backdrop-blur-md transition-shadow duration-300 hover:shadow-[0_24px_56px_-20px_rgba(255,122,0,0.2)] dark:border-white/10 dark:bg-zinc-900/40">
                <div
                  className={`pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br opacity-60 transition-opacity duration-300 group-hover:opacity-90 ${s.accent}`}
                  aria-hidden
                />
                <div className="relative space-y-5 p-6 sm:p-8">
                  {/* Header */}
                  <div className="flex items-start gap-4">
                    <span
                      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/60 text-3xl shadow-inner ring-1 ring-white/50 dark:bg-zinc-800/80 dark:ring-white/10"
                      aria-hidden
                    >
                      {s.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-kal-muted">
                        Practice {idx + 1}
                      </span>
                      <h3 className="mt-1 text-lg font-bold leading-snug text-kal-text sm:text-xl">
                        {s.title}
                      </h3>
                    </div>
                  </div>

                  {/* Research hook */}
                  <blockquote className="rounded-xl border-l-4 border-kal-accent/60 bg-white/50 py-3 pl-4 pr-4 dark:bg-zinc-800/50">
                    <p className="text-sm font-semibold leading-relaxed text-kal-text sm:text-base">
                      &ldquo;{s.researchHook}&rdquo;
                    </p>
                  </blockquote>

                  {/* Detail paragraph */}
                  <p className="text-sm leading-relaxed text-kal-text-secondary sm:text-[0.95rem]">
                    {s.researchDetail}
                  </p>

                  {/* Citations */}
                  <div className="space-y-1.5">
                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-kal-muted">
                      Research Citations
                    </p>
                    <ul className="space-y-1">
                      {s.citations.map((c) => (
                        <li
                          key={c}
                          className="flex gap-2 text-xs leading-relaxed text-kal-text-secondary"
                        >
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-kal-accent/60" aria-hidden />
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Kalnehi connection */}
                  <div className="overflow-hidden rounded-xl border border-kal-accent/30 bg-white/70 shadow-sm dark:bg-zinc-900/60">
                    <div className="flex items-center gap-1.5 border-b border-kal-accent/20 bg-kal-accent/8 px-4 py-2">
                      <span className="text-xs" aria-hidden>✦</span>
                      <span className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-kal-accent">
                        In Kalnehi Daily
                      </span>
                    </div>
                    <p className={`px-4 py-3 text-sm font-semibold leading-relaxed ${s.badgeColor}`}>
                      {s.kalnehiConnection}
                    </p>
                  </div>
                </div>
              </article>
            </li>
          ))}
        </ol>
      </section>

      {/* Topper quotes strip */}
      <section
        aria-label="What toppers say"
        className="relative overflow-hidden rounded-2xl border border-white/40 bg-gradient-to-br from-white/60 via-kal-accent-soft/20 to-white/50 p-6 shadow-[0_16px_40px_-20px_rgba(255,122,0,0.2)] backdrop-blur-md dark:border-white/10 dark:from-zinc-900/75 dark:via-orange-950/20 dark:to-zinc-900/60 sm:p-8"
      >
        <div
          className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-kal-accent/15 blur-3xl"
          aria-hidden
        />
        <div className="relative space-y-6">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-kal-accent">
              From those who made it
            </p>
            <h2 className="kal-section-heading mt-2">
              What Toppers Do Differently
            </h2>
          </div>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              {
                quote:
                  "I planned every single day the night before. No plan meant a wasted day — simple as that.",
                attribution:
                  "AIR 7, JEE Advanced — interview, popular coaching institute study material (2023)",
              },
              {
                quote:
                  "Revision wasn't optional. I tracked which topics I'd done and set hard deadlines for each revisit.",
                attribution:
                  "AIR 3, NEET — interview, popular coaching institute blog (2022)",
              },
              {
                quote:
                  "I meditated for 10 minutes every morning. The calm it gave me during the paper was worth 20 marks.",
                attribution:
                  "UPSC Rank 12 — interview, popular coaching institute YouTube channel (2023)",
              },
              {
                quote:
                  "One focused hour beats three distracted ones. I used timers, tracked actual study minutes, and stopped lying to myself.",
                attribution:
                  "AIR 22, JEE Advanced — interview, popular coaching institute webinar (2024)",
              },
            ].map((q) => (
              <li
                key={q.attribution}
                className="rounded-xl border border-white/40 bg-white/50 p-4 dark:border-white/10 dark:bg-zinc-800/50"
              >
                <blockquote className="space-y-2">
                  <p className="text-sm leading-relaxed text-kal-text">
                    &ldquo;{q.quote}&rdquo;
                  </p>
                  <footer className="text-[0.7rem] font-medium text-kal-muted">{q.attribution}</footer>
                </blockquote>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section
        aria-label="Get started"
        className="relative overflow-hidden rounded-3xl border border-kal-accent/35 bg-gradient-to-br from-white/75 via-kal-accent-soft/25 to-white/60 p-8 shadow-[0_24px_64px_-28px_rgba(255,122,0,0.4)] backdrop-blur-lg dark:border-kal-accent/25 dark:from-zinc-900/85 dark:via-orange-950/25 dark:to-zinc-900/75 sm:p-10"
      >
        <div
          className="pointer-events-none absolute -left-12 -top-16 h-48 w-48 rounded-full bg-kal-accent/20 blur-3xl motion-safe:animate-pulse"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-12 -right-10 h-40 w-40 rounded-full bg-sky-400/15 blur-3xl"
          aria-hidden
        />
        <div className="relative space-y-6 text-center">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-kal-accent">
              Start today
            </p>
            <h2 className="kal-hero-heading text-balance">
              Build the habits that top rankers swear by.
            </h2>
            <p className="mx-auto max-w-lg text-pretty text-sm leading-relaxed text-kal-text-secondary sm:text-base">
              Every single practice on this page is live in the app right now. Start your 3-day
              free trial and feel the difference — don&apos;t just read about it.
            </p>
          </div>

          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/pricing"
              className="kal-btn-accent min-h-[52px] w-full text-center sm:w-auto"
            >
              See pricing
            </Link>
            <Link
              href="/what-can-kalnehi-do"
              className="kal-btn-ghost min-h-[52px] w-full text-center sm:w-auto"
            >
              See all features →
            </Link>
          </div>

          <p className="text-xs text-kal-muted">
            Paid trial. Cancel anytime. Backed by science, built for India.
          </p>
        </div>
      </section>
    </div>
  );
}
