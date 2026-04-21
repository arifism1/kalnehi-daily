"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import clsx from "clsx";

import { LANDING_FAQ_ITEMS } from "@/lib/landing-faqs";

export function FAQSection() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="bg-[#F2EFE8] py-24 lg:py-32" id="faq">
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
        <div className="mb-14 max-w-lg">
          <h2
            className="mb-4 text-3xl font-normal leading-tight tracking-tight text-kal-text sm:text-4xl lg:text-[2.75rem]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Common questions.
          </h2>
          <p className="text-lg text-kal-text-secondary">
            Straight answers — no marketing speak.
          </p>
        </div>

        <div className="mx-auto max-w-3xl space-y-2">
          {LANDING_FAQ_ITEMS.map(({ question, answer }, i) => (
            <div
              key={question}
              className="overflow-hidden rounded-2xl border border-kal-border bg-white/70"
            >
              <button
                type="button"
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                aria-expanded={open === i}
              >
                <span className="text-base font-semibold text-kal-text">{question}</span>
                <ChevronDown
                  className={clsx(
                    "h-4 w-4 shrink-0 text-kal-muted transition-transform duration-200",
                    open === i && "rotate-180",
                  )}
                  aria-hidden
                />
              </button>
              {open === i && (
                <div className="border-t border-kal-border px-6 pb-5 pt-4">
                  <p className="text-sm leading-relaxed text-kal-text-secondary">{answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
