"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const FAQS = [
  {
    q: "What stops working on Day 4 of Basic?",
    a: "The marks engine, rank prediction, spaced revision engine, daily log, prep insights, PrepBrain AI coach, and voice control all pause. Your daily planner, syllabus tracker, focus timer, streak heatmap, and doubt tracker remain fully accessible. Your data, streaks, and all progress are preserved exactly as you left them — nothing is deleted.",
  },
  {
    q: "What does PrepBrain actually do?",
    a: "PrepBrain is your personalized AI prep coach, built around your prep — not a generic chatbot. Ask it to explain a concept in depth, quiz you on any topic, identify your weakest areas from your marks data, or suggest exactly what to revise today. It knows your syllabus, your progress, and your patterns. The more you use it, the sharper the guidance gets.",
  },
  {
    q: "What can I do with voice control?",
    a: "Speak to plan your day, log doubts, set reminders, and navigate the app — completely hands-free. Basic plan includes no voice time. Smart Trial gives you 15 minutes for the 3-day window. Smart Plan gives you 60 minutes every month, resetting each cycle. Extra voice minutes are available as add-ons from your subscription settings.",
  },
  {
    q: "Can I go from Basic straight to Smart Plan?",
    a: "Yes, absolutely. You don't need to take the Smart Trial first. At any point during your 3-day Basic window — or even after it ends — you can subscribe directly to Smart Plan at ₹499/month. The Smart Trial is an option for students who want a short AI-powered preview before committing monthly. It is not a required step.",
  },
  {
    q: "Is there a discount for longer autopay?",
    a: "The price stays ₹499/month regardless of how many months you authorise. What changes is the control you set upfront — you decide how many monthly charges the autopay mandate can take (from 1 to 12). The mandate stops automatically after that count is reached. You can also cancel earlier anytime from settings.",
  },
] as const;

export function PricingFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      {FAQS.map(({ q, a }, idx) => {
        const isOpen = openIndex === idx;
        return (
          <div
            key={idx}
            className={`overflow-hidden rounded-2xl border transition-all duration-200 ${
              isOpen
                ? "border-kal-accent/40 bg-kal-card shadow-[0_4px_16px_rgba(255,122,0,0.08)]"
                : "border-kal-border bg-kal-card/60 hover:border-kal-border-strong"
            }`}
          >
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : idx)}
              className="flex w-full items-start justify-between gap-4 px-6 py-5 text-left"
              aria-expanded={isOpen}
            >
              <span className="text-base font-semibold leading-snug text-kal-text">{q}</span>
              <ChevronDown
                className={`mt-0.5 h-5 w-5 shrink-0 text-kal-accent transition-transform duration-200 ${
                  isOpen ? "rotate-180" : ""
                }`}
                aria-hidden
              />
            </button>
            <div
              className={`grid transition-all duration-200 ${
                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="overflow-hidden">
                <p className="px-6 pb-5 text-sm leading-relaxed text-kal-text-secondary">{a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
