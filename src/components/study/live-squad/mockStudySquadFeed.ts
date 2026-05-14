import { examScoreMax } from "@/lib/examProfile";

import type { SquadTemplateFlavor } from "./squadTemplateFlavor";
import type { LiveIndicatorTone, StudySquadEvent } from "./types";

export const SQUAD_FIRST_NAMES = [
  "Rahul",
  "Priya",
  "Amit",
  "Sneha",
  "Arjun",
  "Ananya",
  "Vikram",
  "Kavya",
  "Rohan",
  "Meera",
  "Aditya",
  "Isha",
  "Karan",
  "Divya",
  "Manish",
  "Pooja",
  "Siddharth",
  "Neha",
  "Harsh",
  "Swati",
  "Nikhil",
  "Riya",
  "Varun",
  "Shreya",
  "Gaurav",
  "Tanvi",
  "Dhruv",
  "Aishwarya",
  "Rakesh",
  "Kritika",
  "Sanjay",
  "Anushka",
  "Sameer",
  "Deepika",
  "Yash",
  "Sakshi",
  "Abhishek",
  "Nandini",
  "Vivek",
  "Pallavi",
  "Kunal",
  "Shruti",
  "Rajesh",
  "Lakshmi",
  "Mohit",
  "Sonal",
  "Suresh",
  "Harini",
  "Rehan",
  "Zara",
] as const;

export const SQUAD_SUBJECTS = [
  "Physics",
  "Organic Chemistry",
  "Physical Chemistry",
  "Inorganic Chemistry",
  "Modern History",
  "Ancient History",
  "Indian Polity",
  "Economics",
  "Geography",
  "Environment & Ecology",
  "Biology",
  "Human Physiology",
  "World History",
  "Ethics & Integrity",
  "Statistics",
  "Linear Algebra",
  "Calculus",
  "Current Affairs",
  "Constitutional Law",
  "Data Interpretation",
] as const;

export type SquadLineContext = {
  examDisplay: string;
  subject: string;
  microtopics: number;
  timerMinutes: number;
  mockScore: number;
  mockMax: number;
  mistakeSlots: number;
  revisionRound: number;
  streakDays: number;
  tasksDone: number;
  tasksTotal: number;
  doubtIds: number;
  backlogChunks: number;
  blueprintPages: number;
  recapLines: number;
  voiceCommands: number;
  studySessionMins: number;
  prelimsMcq: number;
  shiftNumber: number;
};

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function nextEventId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `sse-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function randomTone(): LiveIndicatorTone {
  return Math.random() < 0.78 ? "active" : "away";
}

function buildLineContext(
  subject: string,
  examDisplay: string,
  examLabelRaw: string | null,
): SquadLineContext {
  const mockMax = Math.max(100, examScoreMax(examLabelRaw ?? undefined));
  const mockScore = Math.max(1, Math.floor(mockMax * (0.35 + Math.random() * 0.48)));

  return {
    examDisplay,
    subject,
    microtopics: randInt(1, 5),
    timerMinutes: [25, 32, 45, 50, 52, 90][randInt(0, 5)]!,
    mockScore,
    mockMax,
    mistakeSlots: randInt(1, 4),
    revisionRound: randInt(1, 3),
    streakDays: randInt(2, 14),
    tasksDone: randInt(2, 9),
    tasksTotal: randInt(6, 12),
    doubtIds: randInt(1, 5),
    backlogChunks: randInt(1, 3),
    blueprintPages: randInt(1, 4),
    recapLines: randInt(2, 6),
    voiceCommands: randInt(2, 8),
    studySessionMins: [22, 28, 33, 41, 55, 67][randInt(0, 5)]!,
    prelimsMcq: randInt(18, 65),
    shiftNumber: randInt(1, 2),
  };
}

type TemplateFn = (c: SquadLineContext) => string;

const TEMPLATES_GENERAL: TemplateFn[] = [
  (c) =>
    `checked off ${c.microtopics} microtopics in Syllabus Tracker for ${c.examDisplay} — ${c.subject} feels lighter today`,
  (c) =>
    `reordered ${c.tasksTotal} tasks on Today's Plan for ${c.examDisplay}; knocked out ${c.tasksDone} before lunch`,
  (c) =>
    `closed a ${c.timerMinutes}-min Timer block tied to Today's Plan — ${c.subject} drills for ${c.examDisplay}`,
  (c) =>
    `logged a ${c.examDisplay} mock in Mock Test Tracker — overall ${c.mockScore}/${c.mockMax}; ${c.subject} dragged the average`,
  (c) =>
    `tagged ${c.mistakeSlots} mistakes in Mistake Log after a timed ${c.subject} set for ${c.examDisplay}`,
  (c) =>
    `queued ${c.doubtIds} doubts in Doubt Tracker with screenshots from ${c.subject} (${c.examDisplay})`,
  (c) =>
    `marked revision pass ${c.revisionRound} for ${c.subject} inside Revision Tracker — ${c.examDisplay} countdown`,
  (c) =>
    `finished Daily Debrief for ${c.examDisplay}: wins, skips, and tomorrow's top ${c.subject} slice`,
  (c) =>
    `opened Consistency Tracker — ${c.streakDays}-day streak while prepping ${c.examDisplay}`,
  (c) =>
    `Exported Today's Recap card for ${c.examDisplay} with ${c.recapLines} headline stats after tonight's ${c.subject} block`,
  (c) =>
    `compared two saved days in Saved Daily Plans to see how ${c.subject} hours moved week over week (${c.examDisplay})`,
  (c) =>
    `re-read Target Score Blueprint pages ${c.blueprintPages}–${c.blueprintPages + 2} for ${c.examDisplay} — focusing ${c.subject}`,
  (c) =>
    `split a backlog burst in Backlog Tracker into bite tasks for ${c.examDisplay} (${c.backlogChunks} chunks)`,
  (c) =>
    `scrolled Progress for ${c.examDisplay}: ${c.subject} weighted completion inching up after today's block`,
  (c) =>
    `used Dictate My Day with ${c.voiceCommands} voice commands to dump ${c.subject} todos before ${c.examDisplay} mocks`,
  (c) =>
    `asked Mastermind for a tight ${c.subject} checklist for the next 72h of ${c.examDisplay} prep`,
  (c) =>
    `posted Missed Tasks review — rescheduled ${c.tasksDone} ${c.subject}-linked items for ${c.examDisplay}`,
  (c) =>
    `ended an on-camera study session log after ${c.studySessionMins} focused minutes on ${c.subject} (${c.examDisplay})`,
  (c) =>
    `logged ${c.studySessionMins}+ on-device minutes in study sessions — ${c.subject} only, ${c.examDisplay} mode`,
  (c) =>
    `Brain Yoga quick reset between two ${c.subject} Pomodoros on ${c.examDisplay} week's toughest chapter`,
];

const TEMPLATES_UPSC: TemplateFn[] = [
  (c) =>
    `drilled ${c.prelimsMcq} prelims-style MCQs in Current Affairs + ${c.subject} for ${c.examDisplay}`,
  (c) =>
    `mapped ${c.subject} to last year's PYQ mix inside Syllabus Tracker — ${c.examDisplay} mains lens`,
  (c) =>
    `Drafted mains answer bullets for ${c.subject} (${c.examDisplay}) after checking Ethics notes in Kalnehi`,
  (c) =>
    `asked Mastermind how to balance ${c.subject} vs. GS time this week for ${c.examDisplay}`,
  (c) =>
    `logged ${c.mockScore}-ish mock essay score estimate after a ${c.subject} ${c.examDisplay} simulation`,
];

const TEMPLATES_JEE: TemplateFn[] = [
  (c) =>
    `logged JEE-style numeric blitz in Mistake Log — ${c.subject}, session ${c.shiftNumber} drill pack for ${c.examDisplay}`,
  (c) =>
    `tagged ${c.microtopics} JEE syllabus microtopics done in ${c.subject} for ${c.examDisplay} in Syllabus Tracker`,
  (c) =>
    `recorded a full-length practice in Mock Test Tracker — ${c.mockScore}/${c.mockMax}, ${c.subject} saved weakest`,
  (c) =>
    `ran ${c.timerMinutes}-min deep work Timer on ${c.subject} integration problems (${c.examDisplay})`,
];

const TEMPLATES_MEDICAL: TemplateFn[] = [
  (c) =>
    `logged ${c.mockScore}/${c.mockMax} on a biology-heavy mock in Mock Test Tracker — ${c.examDisplay}; ${c.subject} triage next`,
  (c) =>
    `updated Syllabus Tracker: ${c.microtopics} NCERT-linked microtopics in ${c.subject} for ${c.examDisplay}`,
  (c) =>
    `Revision Tracker: ${c.revisionRound} pass on ${c.subject} diagrams before ${c.examDisplay} weekly test`,
  (c) =>
    `Mastermind asked for high-yield ${c.subject} topics this week — ${c.examDisplay} seating soon`,
];

const TEMPLATES_GATE: TemplateFn[] = [
  (c) =>
    `noted ${c.subject} technical highlights in Mistake Log after a ${c.examDisplay} subject test in Mock Test Tracker`,
  (c) =>
    `Syllabus Tracker: ${c.microtopics} GATE syllabus nodes cleared in ${c.subject} for ${c.examDisplay}`,
];

const TEMPLATES_BANKING: TemplateFn[] = [
  (c) =>
    `logged sectional timings in Mock Test Tracker — ${c.subject} cutoffs for ${c.examDisplay}; score ~${c.mockScore}`,
  (c) =>
    `Today's Plan: ${c.tasksDone}/${c.tasksTotal} reasoning + ${c.subject} sets done for ${c.examDisplay}`,
];

const TEMPLATES_LAW: TemplateFn[] = [
  (c) =>
    `tagged ${c.mistakeSlots} legal reasoning errors in Mistake Log — CLAT-style bundle for ${c.examDisplay}`,
  (c) =>
    `Mastermind outline for ${c.subject} current-affairs links mapped to ${c.examDisplay}`,
];

const TEMPLATES_MBA: TemplateFn[] = [
  (c) =>
    `logged DI + ${c.subject} mixed set in Mock Test Tracker — ${c.mockScore} scaled points toward ${c.examDisplay}`,
  (c) =>
    `Timer ladder: ${c.timerMinutes} + ${c.timerMinutes + 8} min back-to-back on ${c.subject} (${c.examDisplay})`,
];

function templatesForFlavor(flavor: SquadTemplateFlavor): TemplateFn[] {
  const core = [...TEMPLATES_GENERAL];
  switch (flavor) {
    case "upsc":
      return [...core, ...TEMPLATES_UPSC];
    case "jee":
      return [...core, ...TEMPLATES_JEE];
    case "medical":
      return [...core, ...TEMPLATES_MEDICAL];
    case "gate":
      return [...core, ...TEMPLATES_GATE];
    case "banking":
      return [...core, ...TEMPLATES_BANKING];
    case "law":
      return [...core, ...TEMPLATES_LAW];
    case "mba":
      return [...core, ...TEMPLATES_MBA];
    default:
      return core;
  }
}

export type GenerateStudySquadEventOptions = {
  /** Syllabus-backed labels only; when empty, a neutral line is emitted (no generic subjects). */
  subjectPool: readonly string[];
  /** Short exam label for the viewer (same as Syllabus / Profile). */
  examDisplay: string;
  /** Raw profile exam for mock score caps. */
  examLabel?: string | null;
  /** Derived exam family for extra templates. */
  flavor: SquadTemplateFlavor;
};

export function generateStudySquadEvent(options: GenerateStudySquadEventOptions): StudySquadEvent {
  if (options.subjectPool.length === 0) {
    return {
      id: nextEventId(),
      peerName: pickRandom(SQUAD_FIRST_NAMES),
      subject: "Syllabus",
      status:
        "No syllabus microtopics loaded yet — open Syllabus Tracker once your catalog is ready. This feed won’t invent topics (simulated activity).",
      tone: "away",
    };
  }

  const subject = pickRandom(options.subjectPool);
  const ctx = buildLineContext(subject, options.examDisplay, options.examLabel ?? null);
  const list = templatesForFlavor(options.flavor);
  const status = pickRandom(list)(ctx);

  return {
    id: nextEventId(),
    peerName: pickRandom(SQUAD_FIRST_NAMES),
    subject,
    status,
    tone: randomTone(),
  };
}
