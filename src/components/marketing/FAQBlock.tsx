"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import clsx from "clsx";

export interface FAQItem {
  question: string;
  answer: string;
}

interface FAQBlockProps {
  items: FAQItem[];
  title?: string;
}

function FAQEntry({ question, answer }: FAQItem) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-kal-border last:border-0">
      <button
        type="button"
        className="flex w-full items-start justify-between gap-4 py-4 text-left text-sm font-semibold text-kal-text"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>{question}</span>
        <ChevronDown
          className={clsx("mt-0.5 size-4 shrink-0 text-kal-muted transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>
      {open && (
        <p className="pb-4 text-sm leading-relaxed text-kal-text-secondary">{answer}</p>
      )}
    </div>
  );
}

export function FAQBlock({ items, title = "Frequently asked questions" }: FAQBlockProps) {
  return (
    <section aria-labelledby="faq-heading" className="space-y-1">
      <h2 id="faq-heading" className="text-lg font-semibold text-kal-text">{title}</h2>
      <div className="mt-3 divide-y divide-kal-border rounded-2xl border border-kal-border bg-kal-card px-4 py-1">
        {items.map((item) => (
          <FAQEntry key={item.question} {...item} />
        ))}
      </div>
    </section>
  );
}
