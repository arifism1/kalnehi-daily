"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";

import {
  SMART_PLAN_ANNUAL_BILLING_LABEL,
  SMART_PLAN_ANNUAL_TOTAL_DISPLAY,
  SMART_PLAN_MONTHLY_DISPLAY,
  SMART_PLAN_SIX_MONTH_BILLING_LABEL,
  SMART_PLAN_SIX_MONTH_TOTAL_DISPLAY,
} from "@/lib/smartPlanPricing";

function buildFaqs(): { q: string; a: string }[] {
  const m = SMART_PLAN_MONTHLY_DISPLAY;
  return [
    {
      q: "What is included in the 7-day free trial?",
      a: "All product features for seven days: voice planning, syllabus tracker, focus timer, study camera, streaks, doubts, marks engine, revision queue, daily log, Mastermind Strategy Coach, plus 60,000 Mastermind tokens and 5 minutes of voice.",
    },
    {
      q: "What happens after the 7-day free trial ends?",
      a: `You need Smart Plan to keep using the app (${m}/month, or 6 months upfront at ${SMART_PLAN_SIX_MONTH_TOTAL_DISPLAY} — save ₹895, or 12 months at ${SMART_PLAN_ANNUAL_TOTAL_DISPLAY} — save ₹2,400). Your data and progress stay put. Subscribe from pricing or subscription settings whenever you're ready.`,
    },
    {
      q: "Is a credit card required to start the trial?",
      a: "No. Sign up, finish onboarding, and start the trial from the pricing page — no card.",
    },
    {
      q: "Can I upgrade to Smart Plan during the free trial?",
      a: "Yes. Subscribe anytime, including during the trial. Billing moves to Smart Plan on the schedule you pick.",
    },
    {
      q: "I'm on monthly Smart Plan — can I switch to 6 months or annual?",
      a: `Yes. On Pricing, pick 6 Months (${SMART_PLAN_SIX_MONTH_TOTAL_DISPLAY}) or Annual (${SMART_PLAN_ANNUAL_TOTAL_DISPLAY}) and complete checkout. After payment succeeds, your monthly AutoPay is stopped before your upfront plan turns on, so you won't be charged monthly on that mandate anymore. If activation briefly fails, retry checkout or use Payment help with your proof — your payment is recorded.`,
    },
    {
      q: "What does Mastermind actually do?",
      a: "It looks at what you've logged — syllabus, tasks, marks engine, habits — and answers in plain language: what to revise, how to order the week, what to worry about first. It does not replace a tutor for solving problems or teaching a chapter; use another chatbot for that. Smart Plan includes 2 million tokens per month.",
    },
    {
      q: "What can I do with voice control?",
      a: "Dictate your plan, log doubts, set reminders, and move around the app. The trial includes 5 minutes of voice total. Smart Plan includes 100 minutes per month, resetting each billing cycle.",
    },
    {
      q: "Is there a discount for longer autopay?",
      a: `The monthly rate is still ${m}/month. On AutoPay you choose how many monthly charges to allow (1–12); the mandate stops after that. Or pay upfront for 6 months (${SMART_PLAN_SIX_MONTH_BILLING_LABEL} — save ₹895) or 12 months (${SMART_PLAN_ANNUAL_BILLING_LABEL} — save ₹2,400); moving from monthly to upfront stops monthly AutoPay when payment completes. Cancel from settings anytime.`,
    },
  ];
}

export function PricingFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const faqs = useMemo(() => buildFaqs(), []);

  return (
    <div className="space-y-3">
      {faqs.map(({ q, a }, idx) => {
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
                className={`mt-0.5 size-5 shrink-0 text-kal-accent transition-transform duration-200 ${
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
