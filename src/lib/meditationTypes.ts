export type MeditationTypeId =
  | "focus_breath"
  | "body_scan"
  | "exam_visualization"
  | "gratitude_reset"
  | "quick_anxiety_reset"
  | "loving_kindness";

export type MeditationTypeDef = {
  id: MeditationTypeId;
  title: string;
  durationLabel: string;
  durationRangeMinutes: [number, number];
  benefit: string;
  description: string;
  /** Spoken during a live session (Web Speech); not shown as a list on the practice card. */
  voiceGuidedSteps: readonly string[];
};

export const MEDITATION_TYPES: MeditationTypeDef[] = [
  {
    id: "focus_breath",
    title: "Focus Breath",
    durationLabel: "5-10 min",
    durationRangeMinutes: [5, 10],
    benefit: "Stretches attention like a posture—steady focus for exam-hour calm",
    description:
      "Train your mind like a yoga practice—steady breath to sharpen exam-hour attention and inner calm.",
    voiceGuidedSteps: [
      "Sit tall, relax your shoulders, and let your hands rest easily.",
      "Take one deep inhale, then exhale slowly through the nose.",
      "Feel the air at the nose tip as you breathe.",
      "Now count each exhale from one to ten, at your pace.",
      "Let each number be gentle, not forced.",
      "If you lose the count, good catch. Start again from one.",
      "Keep your jaw soft and your eyes easy.",
      "Stay with the breath. One exhale, one count.",
      "If thoughts come in, label them and return to counting.",
      "Notice your mind settling a little more each round.",
      "Take one quieter breath and reset your posture softly.",
      "Last slow breath. Keep this steady focus for your next study block.",
    ],
  },
  {
    id: "body_scan",
    title: "Body Scan",
    durationLabel: "8-12 min",
    durationRangeMinutes: [8, 12],
    benefit: "Releases study tension—mind and body reconnect breath by breath",
    description:
      "Gently sweep awareness from head to toe—release exam tension like easing deeper into a long, kind stretch.",
    voiceGuidedSteps: [
      "Lie down or sit comfortably. Take three slow breaths.",
      "Bring attention to the top of your head. Just notice.",
      "No need to change anything. You are only observing.",
      "Move down to your face, jaw, and neck. Let them soften.",
      "Now scan shoulders, arms, and chest with a slow exhale.",
      "Notice one spot that feels neutral or calm.",
      "If you find tension, do not fix it. Just breathe into it.",
      "Move through your belly, hips, legs, and feet.",
      "Let your breath travel all the way to your lower body.",
      "Feel your whole body together for one full breath.",
      "Give your body a quiet thank you for carrying you today.",
      "Open your eyes slowly. Carry this ease into your day.",
    ],
  },
  {
    id: "exam_visualization",
    title: "Exam Visualization",
    durationLabel: "6-10 min",
    durationRangeMinutes: [6, 10],
    benefit: "Builds calm confidence—mental rehearsal with breath and poise",
    description:
      "Walk the exam hall in imagination—steady breath, clear mind, the same focus you’ll bring on the real day.",
    voiceGuidedSteps: [
      "Close your eyes and feel both feet grounded.",
      "Picture yourself arriving on time, calm and prepared.",
      "See your shoulders relaxed as you enter the room.",
      "See yourself sitting down and setting up with steady hands.",
      "Read the first question slowly. Start with a clear first step.",
      "Keep your breath smooth while you choose what to solve first.",
      "If a tough question appears, pause and take one slow exhale.",
      "Move to the next doable step without panic.",
      "Imagine your focus returning quickly after each pause.",
      "See yourself finishing with calm effort and clear focus.",
      "Picture yourself checking key answers with steady attention.",
      "One final breath. Open your eyes ready for real practice.",
    ],
  },
  {
    id: "gratitude_reset",
    title: "Gratitude Reset",
    durationLabel: "3-7 min",
    durationRangeMinutes: [3, 7],
    benefit: "Opens the heart—small wins refill motivation without forcing hustle",
    description:
      "Light a quiet inner warmth—notice progress, breathe ease, and return to prep with a softer spine.",
    voiceGuidedSteps: [
      "Sit comfortably. Place a hand on your chest if you like.",
      "Name one small win from today. Keep it simple and honest.",
      "Let that win land before moving to the next thought.",
      "Take a slow exhale and let your shoulders drop.",
      "Now name one person or thing that supported your journey.",
      "Notice any warmth in your chest as you remember it.",
      "If comparison shows up, notice it and come back to breath.",
      "Set one gentle intention for your next study block.",
      "Make that intention tiny and clear so it is easy to start.",
      "Take three slow breaths and hold this steady gratitude.",
    ],
  },
  {
    id: "quick_anxiety_reset",
    title: "Quick Anxiety Reset",
    durationLabel: "2-4 min",
    durationRangeMinutes: [2, 4],
    benefit: "Centres you fast—breath and body return before the paper begins",
    description:
      "A short flow to soften nerves before a mock or tough block—find the floor, find your breath, begin again.",
    voiceGuidedSteps: [
      "Place both feet on the floor and feel the ground.",
      "Exhale longer than you inhale for the next three breaths.",
      "Keep your breath low and slow in the belly.",
      "Name one thing you see and one thing you hear.",
      "Relax your jaw and drop your shoulders.",
      "Unclench your hands and loosen your forehead.",
      "Tell yourself: I only need the next breath and next step.",
      "Take one more long exhale and let your body settle.",
      "Open your eyes and pick one small task to begin.",
    ],
  },
  {
    id: "loving_kindness",
    title: "Loving-Kindness",
    durationLabel: "5-8 min",
    durationRangeMinutes: [5, 8],
    benefit: "Softens inner dialogue—compassion as strength before and after study",
    description:
      "Send warmth inward and outward—replace harsh self-talk with the same care you’d offer a good friend.",
    voiceGuidedSteps: [
      "Sit tall and breathe slowly through your nose.",
      "Say quietly: May I be calm. May I keep learning.",
      "Say it once more, with a softer tone.",
      "On each exhale, soften your chest and face.",
      "Now offer the same wish to someone who supports you.",
      "Picture that person clearly for one full breath.",
      "Extend that wish to others preparing like you.",
      "Include even the people you find difficult, just for this moment.",
      "If self-criticism appears, answer with one kind sentence.",
      "Let that kind sentence repeat for the next two breaths.",
      "Take three slow breaths and return with a softer mind.",
    ],
  },
];

/** User-facing label for a stored session type — never returns raw ids or slugs. */
export function meditationSessionTypeTitle(
  sessionType: string | null | undefined,
): string {
  const id = sessionType?.trim();
  if (!id) return "Brain Yoga session";
  const def = MEDITATION_TYPES.find((t) => t.id === id);
  return def?.title ?? "Brain Yoga session";
}

export const MEDITATION_SOUNDS = [
  "Rain",
  "Forest",
  "Ocean",
  "Soft Bells",
  "White Noise",
] as const;

export type MeditationSound = (typeof MEDITATION_SOUNDS)[number];

export type MeditationSessionRow = {
  id: string;
  user_id: string;
  date: string;
  duration_minutes: number;
  session_type: MeditationTypeId;
  notes: string | null;
  guided: boolean;
  soundscape: MeditationSound | null;
  duration_seconds: number;
  // Legacy compatibility for previously-synced rows.
  session_date?: string;
  meditation_type?: MeditationTypeId;
  note?: string | null;
  updated_at?: string;
  guided_mode?: boolean;
  background_sound?: MeditationSound | null;
  created_at: string;
};
