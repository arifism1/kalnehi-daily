"use client";

import { useState } from "react";
import { Check, Minus } from "lucide-react";
import Link from "next/link";

type FeatureValue = boolean | string | null;

const FEATURES: { name: string; trial: FeatureValue; smart: FeatureValue }[] = [
  { name: "Daily planner", trial: true, smart: true },
  { name: "Syllabus tracker", trial: true, smart: true },
  { name: "Focus timer + study camera", trial: true, smart: true },
  { name: "Streak + consistency heatmap", trial: true, smart: true },
  { name: "Doubt tracker", trial: true, smart: true },
  { name: "Marks engine + rank prediction", trial: true, smart: true },
  { name: "Spaced revision engine", trial: true, smart: true },
  { name: "Daily log & prep insights", trial: true, smart: true },
  { name: "PrepBrain AI coach", trial: true, smart: true },
  { name: "Voice control", trial: "12 min total", smart: "100 hrs/month" },
  { name: "PrepBrain tokens", trial: "60,000 total", smart: "20,00,000/month" },
];

type PlanKey = "trial" | "smart";

const PLANS: {
  key: PlanKey;
  label: string;
  price: string;
  duration: string;
  cta: string;
  ctaHref: string;
  highlight: boolean;
}[] = [
  {
    key: "trial",
    label: "Free Trial",
    price: "₹0",
    duration: "3 days",
    cta: "Start free trial",
    ctaHref: "/auth",
    highlight: false,
  },
  {
    key: "smart",
    label: "Smart Plan",
    price: "₹499",
    duration: "/month",
    cta: "Subscribe — ₹499/month",
    ctaHref: "#subscribe",
    highlight: true,
  },
];

function FeatureRow({ value }: { value: FeatureValue }) {
  if (value === true)
    return <Check className="h-4 w-4 text-emerald-500 dark:text-emerald-400" strokeWidth={2.5} aria-label="Included" />;
  if (value === false || value === null)
    return <Minus className="h-4 w-4 text-kal-muted/50" strokeWidth={2} aria-label="Not included" />;
  return <span className="text-xs font-semibold tabular-nums text-kal-text">{value}</span>;
}

export function PricingTableMobile() {
  const [active, setActive] = useState<PlanKey>("trial");
  const plan = PLANS.find((p) => p.key === active)!;

  return (
    <div>
      {/* Tab switcher */}
      <div className="mb-4 flex rounded-2xl border border-kal-border bg-kal-card-muted p-1 gap-1">
        {PLANS.map((p) => {
          const isActive = active === p.key;
          const badge =
            p.key === "trial"
              ? {
                  label: "Free",
                  color: isActive
                    ? "bg-emerald-500/25 text-emerald-100"
                    : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
                }
              : {
                  label: "₹499",
                  color: isActive ? "bg-white/20 text-white" : "bg-kal-accent/15 text-kal-accent",
                };

          return (
            <button
              key={p.key}
              type="button"
              onClick={() => setActive(p.key)}
              aria-pressed={isActive}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-2.5 transition-all ${
                isActive
                  ? p.highlight
                    ? "bg-kal-accent text-white shadow-sm"
                    : "bg-kal-bg-elevated text-kal-text shadow-sm"
                  : "text-kal-text-secondary hover:text-kal-text"
              }`}
            >
              <span className="text-[11px] font-bold leading-none">{p.label}</span>
              <span
                className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide leading-none ${badge.color}`}
              >
                {badge.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active plan card */}
      <div
        className={`rounded-2xl border-2 ${
          plan.highlight
            ? "border-kal-accent bg-gradient-to-b from-kal-accent/8 to-kal-card shadow-[0_4px_24px_rgba(255,122,0,0.14)]"
            : "border-kal-border bg-kal-card"
        }`}
      >
        {/* Plan header */}
        <div className="flex items-center justify-between border-b border-kal-border px-5 py-4">
          <div>
            {plan.highlight && (
              <span className="mb-1 inline-block rounded-full bg-kal-accent px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                Smart Plan
              </span>
            )}
            {!plan.highlight && (
              <span className="mb-1 inline-block rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                3 Days Free
              </span>
            )}
            <p
              className={`text-lg font-bold ${plan.highlight ? "text-kal-accent" : "text-kal-text-secondary"}`}
            >
              {plan.label}
            </p>
          </div>
          <div className="text-right">
            <p
              className="text-2xl font-normal text-kal-text"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {plan.price}
            </p>
            <p className="text-xs text-kal-muted">{plan.duration}</p>
          </div>
        </div>

        {/* Feature rows */}
        <div className="divide-y divide-kal-border/60">
          {FEATURES.map((f) => (
            <div key={f.name} className="flex items-center justify-between px-5 py-3">
              <span className="text-sm text-kal-text-secondary">{f.name}</span>
              <span className="flex shrink-0 items-center justify-end pl-4">
                <FeatureRow value={f[plan.key]} />
              </span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="p-4">
          <Link
            href={plan.ctaHref}
            className={`flex min-h-[48px] items-center justify-center rounded-full text-sm font-bold transition ${
              plan.highlight
                ? "bg-kal-accent text-white shadow-[0_4px_16px_rgba(255,122,0,0.28)] hover:brightness-105"
                : "border border-kal-border bg-kal-card text-kal-text hover:border-kal-accent/40 hover:text-kal-accent"
            }`}
          >
            {plan.cta}
          </Link>
        </div>
      </div>
    </div>
  );
}
