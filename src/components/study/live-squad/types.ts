export type LiveIndicatorTone = "active" | "away";

export type StudySquadEvent = {
  id: string;
  peerName: string;
  subject: string;
  /** Short status phrase, e.g. "just started studying" */
  status: string;
  tone: LiveIndicatorTone;
};
