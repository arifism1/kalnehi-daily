/** Shared types for Personal Motivation (client + server safe). */

export type MotivationOutboxOp =
  | {
      kind: "letter_upsert";
      letterDate: string;
      body: string;
      pinned: boolean;
      sealed: boolean;
      openDate: string | null;
    }
  | {
      kind: "voice_create";
      id: string;
      transcript: string;
      tags: string[];
      audioBase64: string | null;
      audioMime: string | null;
      recordedAt: string;
    }
  | {
      kind: "photo_create";
      id: string;
      imageDataUrl: string;
      caption: string | null;
      photoDate: string;
      isWallpaper: boolean;
    }
  | {
      kind: "wallpaper_set";
      photoId: string | null;
    };

export const MOTIVATION_VOICE_TAGS = [
  "Gratitude",
  "Motivation",
  "Reminder",
  "Discipline",
] as const;
