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
      "Sit comfortably with your spine tall and quiet, like a steady mountain—let your sitting bones root downward.",
      "Gently close your eyes, or soften your gaze, and invite your shoulders to melt away from your ears.",
      "Take a full breath in through your nose; on your next exhale, silently whisper the word “one” in your mind.",
      "Continue breathing naturally, counting each exhale from one up to ten—no rush, only rhythm.",
      "When you reach ten, on the next exhale begin again at one—each round is a gentle stretch for your focus.",
      "If your mind wanders, notice it with warmth, and on the following breath return to the count—no judgment, only return.",
      "Feel the stretch in your focus with every cycle: breath soft, mind a little clearer, ready for the page in front of you.",
      "When you are ready to close, take one slow inhale, a longer exhale, and carry this steadiness into your study.",
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
      "Lie down or sit tall; place one hand on your belly if it helps, and take three slow breaths to arrive fully in your body.",
      "Gently bring your awareness to the crown of your head—notice tingling, warmth, or nothing at all, without fixing.",
      "On your next exhale, let attention drift down through your face, jaw, and neck, softening whatever clenches from long hours.",
      "Travel slowly through shoulders, arms, and chest—breathe space into the places that hold your study load.",
      "With each out-breath, imagine tension unwinding like a knot loosening; you are not forcing, only allowing.",
      "Continue down through belly, hips, legs, and feet—stay curious, breath by breath, inch by inch.",
      "Return awareness to the whole body; inhale kindness, exhale anything you no longer need to carry right now.",
      "Seal the practice with eyes closed for one more breath cycle, then open softly, mind and body on the same team.",
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
      "Settle into stillness; close your eyes and feel both feet grounded, as if you are already standing in your strength.",
      "Picture yourself arriving at the exam centre on time, prepared—not perfect, but present and composed.",
      "On your next inhale, imagine walking in calmly: finding your seat, laying out what you need, shoulders easy.",
      "Visualize reading the first lines of the paper with clarity—one question at a time, no need to sprint ahead.",
      "If a hard question appears, see yourself pausing, taking one conscious exhale, and choosing a gentle next move.",
      "Feel the stretch in your focus as you stay with the paper minute by minute, trusting the work you have already done.",
      "Imagine finishing with dignity in your heart, whatever the outcome—effort and presence are yours to keep.",
      "Take one slow breath in gratitude for this rehearsal, then open your eyes with a soft gaze, ready for real practice.",
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
      "Find a seat that feels kind; rest a hand on your heart if you wish, and breathe as if making room inside.",
      "Silently name one honest win from today’s preparation—even a tiny step is worthy of this breath.",
      "On the exhale, let your shoulders drop; gratitude does not need to be loud to be true.",
      "If comparison knocks, meet it with patience, like easing deeper into a stretch instead of snapping out.",
      "Whisper inward one thing you are thankful for in your journey—a person, a book, your own showing up.",
      "Set one gentle intention for your next study block—small enough to keep, kind enough to sustain you.",
      "Close with three slow breaths, feeling warmth you can return to whenever the path feels steep.",
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
      "Plant both feet and feel the earth; let your next exhale roll out a little longer than your inhale, like a slow wave.",
      "Name quietly what you see nearest you, then what you hear—gently bring your mind into this room, this moment.",
      "Roll your shoulders back once; unclench your jaw and soften the space between your eyebrows.",
      "Whisper inward: “This wave can move through me; I only need the next breath and the next small step.”",
      "Place a hand on your belly and feel it rise and fall—your body knows how to settle if you give it a few rounds.",
      "When your breath feels steadier, open your eyes and choose one manageable task—then the next, with kindness.",
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
      "Sit with dignity, spine tall but soft; breathe in through the nose as if making space for something gentler.",
      "Silently offer yourself: “May my mind stay flexible; may I learn without turning mistakes into shame.”",
      "On your next exhale, imagine that warmth spreading through your chest—mind and body breathing together.",
      "Extend the same wish to someone who supports you—feel connection without gripping or comparing.",
      "If it feels right, include others walking this path—shared breath toward growth, not a race to the finish.",
      "When criticism appears, answer with one sentence you would give your dearest friend before a big day.",
      "Rest in three slow breaths; carry this softness back to your desk—you are allowed to be human and still rising.",
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
