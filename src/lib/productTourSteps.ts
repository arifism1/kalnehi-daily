export type TourStepPosition = "top" | "right" | "bottom" | "left" | "center";

export type TourStep = {
  id: string;
  title: string;
  description: string;
  /**
   * Alternative description shown when the mobileTarget is used.
   * Lets you write device-appropriate copy without separate steps.
   */
  mobileDescription?: string;
  /**
   * `data-tour` attribute value of the element to spotlight.
   * `null` = no element target — renders a centered modal overlay.
   */
  target: string | null;
  /**
   * Fallback `data-tour` attribute used when the primary target has zero
   * dimensions (e.g. the sidebar is CSS-hidden on mobile).
   */
  mobileTarget?: string;
  /** Where to place the tooltip card relative to the target element. */
  position: TourStepPosition;
  /** Override position when the mobileTarget is used instead of target. */
  mobilePosition?: TourStepPosition;
};

export const PRODUCT_TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to Kalnehi!",
    description:
      "You're all set up. Let's take a quick look at where everything lives — it'll only take a minute.",
    target: null,
    position: "center",
  },
  {
    id: "navigation",
    title: "Your Navigation Hub",
    description:
      "Use the sidebar to jump between study areas — daily plans, syllabus tracker, progress, and more.",
    mobileDescription:
      "These tabs keep your main areas one tap away — Home, Plans, Syllabus, Features, and your Profile.",
    target: "sidebar",
    mobileTarget: "bottom-tabs",
    position: "right",
    mobilePosition: "top",
  },
  {
    id: "voice",
    title: "Voice Commands",
    description:
      "Tap the mic to dictate your study plan, add notes, or record doubts — completely hands-free while you study.",
    target: "voice",
    position: "bottom",
  },
  {
    id: "menu",
    title: "All Your Features",
    description:
      "Open this menu to access every feature, adjust settings, contact support, or install the app — all in one place.",
    target: "menu",
    position: "bottom",
  },
  {
    id: "done",
    title: "You're Ready to Begin",
    description:
      "That's the quick tour. Head to Today's Plan, build your first study schedule, and make today count.",
    target: null,
    position: "center",
  },
];
