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
};

export const MEDITATION_TYPES: MeditationTypeDef[] = [
  {
    id: "focus_breath",
    title: "Focus Breath",
    durationLabel: "5-10 min",
    durationRangeMinutes: [5, 10],
    benefit: "Sharpens concentration",
    description: "Steady breath counting to train exam-hour attention.",
  },
  {
    id: "body_scan",
    title: "Body Scan",
    durationLabel: "8-12 min",
    durationRangeMinutes: [8, 12],
    benefit: "Releases study tension",
    description: "Progressive awareness from head to toe to release tightness.",
  },
  {
    id: "exam_visualization",
    title: "Exam Visualization",
    durationLabel: "6-10 min",
    durationRangeMinutes: [6, 10],
    benefit: "Builds exam confidence",
    description: "Mentally rehearse calm paper-solving with clarity and control.",
  },
  {
    id: "gratitude_reset",
    title: "Gratitude Reset",
    durationLabel: "3-7 min",
    durationRangeMinutes: [3, 7],
    benefit: "Boosts motivation",
    description: "Reconnect with purpose and progress when energy dips.",
  },
  {
    id: "quick_anxiety_reset",
    title: "Quick Anxiety Reset",
    durationLabel: "2-4 min",
    durationRangeMinutes: [2, 4],
    benefit: "Instant calm",
    description: "Fast nervous-system downshift before mocks and tests.",
  },
  {
    id: "loving_kindness",
    title: "Loving-Kindness",
    durationLabel: "5-8 min",
    durationRangeMinutes: [5, 8],
    benefit: "Reduces self-doubt",
    description: "Replace harsh self-talk with steady, supportive inner dialogue.",
  },
];

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
