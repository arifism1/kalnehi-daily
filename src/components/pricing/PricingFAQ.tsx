"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const FAQS = [
  {
    q: "What is included in the 3-day free trial?",
    a: "Everything. Your free trial unlocks the full Kalnehi Daily system — Daily planner, Syllabus tracker, Focus timer, Study camera, Streak heatmap, Doubt tracker, Marks engine, Rank prediction, Spaced revision engine, Daily log, and PrepBrain AI coach. You also get 60,000 PrepBrain AI tokens and 12 minutes of voice control for those 3 days.",
  },
  {
    q: "What happens after the 3-day free trial ends?",
    a: "After your 3-day trial, you'll need to subscribe to Smart Plan (₹499/month) to keep using Kalnehi Daily. Your data, streaks, and all progress are preserved exactly as you left them — nothing is deleted. You can subscribe anytime from the pricing page or your subscription settings.",
  },
  {
    q: "Is a credit card required to start the trial?",
    a: "No. Your 3-day free trial requires no card at all. Just sign up, complete onboarding, and start your trial from the pricing page.",
  },
  {
    q: "Can I upgrade to Smart Plan during the free trial?",
    a: "Yes, absolutely. You can subscribe to Smart Plan at any point during your trial — or even before it starts. Your remaining trial time transitions immediately to your Smart Plan subscription.",
  },
  {
    q: "What does PrepBrain AI actually do?",
    a: "PrepBrain is your personalized AI prep coach built around your prep — not a generic chatbot. Ask it to explain a concept in depth, quiz you on any topic, identify your weakest areas from your marks data, or suggest exactly what to revise today. It knows your syllabus, your progress, and your patterns. Smart Plan gives you 2 million tokens per month.",
  },
  {
    q: "What can I do with voice control?",
    a: "Speak to plan your day, log doubts, set reminders, and navigate the app — completely hands-free. Your 3-day free trial includes 12 minutes of voice time. Smart Plan gives you 100 hours of voice every month, resetting each billing cycle.",
  },
  {
    q: "Is there a discount for longer autopay?",
    a: "The price stays ₹499/month regardless of how many months you authorise. What changes is the control you set upfront — you decide how many monthly charges the autopay mandate can take (from 1 to 12). The mandate stops automatically after that count is reached. You can also cancel anytime from settings.",
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
