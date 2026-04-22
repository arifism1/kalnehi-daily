"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

/* ─── Types ─────────────────────────────────────────────────────────── */

interface ConnectorPath {
  id: string;
  d: string;
  accent: boolean;
  dashed: boolean;
}

/* ─── Geometry helpers ───────────────────────────────────────────────── */

function centerTop(r: DOMRect, base: DOMRect) {
  return { x: r.left - base.left + r.width / 2, y: r.top - base.top };
}
function centerBottom(r: DOMRect, base: DOMRect) {
  return { x: r.left - base.left + r.width / 2, y: r.bottom - base.top };
}
function rightMiddle(r: DOMRect, base: DOMRect) {
  return { x: r.right - base.left, y: r.top - base.top + r.height / 2 };
}
function leftMiddle(r: DOMRect, base: DOMRect) {
  return { x: r.left - base.left, y: r.top - base.top + r.height / 2 };
}

function cubicD(
  x1: number, y1: number,
  x2: number, y2: number,
  cpStrength = 0.5,
  offsetX = 0,
) {
  const dy = y2 - y1;
  const cp1x = x1 + offsetX;
  const cp1y = y1 + dy * cpStrength;
  const cp2x = x2 + offsetX;
  const cp2y = y2 - dy * cpStrength;
  return `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;
}

function horizontalSCurve(
  x1: number, y1: number,
  x2: number, y2: number,
) {
  const dx = x2 - x1;
  const cp1x = x1 + dx * 0.45;
  const cp2x = x2 - dx * 0.45;
  return `M ${x1} ${y1} C ${cp1x} ${y1}, ${cp2x} ${y2}, ${x2} ${y2}`;
}


/* ─── Main component ─────────────────────────────────────────────────── */

export function PathFlowchart() {
  const containerRef = useRef<HTMLDivElement>(null);
  const entryRef = useRef<HTMLDivElement>(null);
  const basicRef = useRef<HTMLDivElement>(null);
  const trialRef = useRef<HTMLDivElement>(null);
  const smartRef = useRef<HTMLDivElement>(null);

  const [paths, setPaths] = useState<ConnectorPath[]>([]);
  const [svgSize, setSvgSize] = useState({ w: 0, h: 0 });

  const computePaths = useCallback(() => {
    const container = containerRef.current;
    const entry = entryRef.current;
    const basic = basicRef.current;
    const trial = trialRef.current;
    const smart = smartRef.current;
    if (!container || !entry || !basic || !trial || !smart) return;

    const base = container.getBoundingClientRect();
    const eR = entry.getBoundingClientRect();
    const bR = basic.getBoundingClientRect();
    const tR = trial.getBoundingClientRect();
    const sR = smart.getBoundingClientRect();

    setSvgSize({ w: base.width, h: base.height });

    const entryBottom = centerBottom(eR, base);
    const basicTop = centerTop(bR, base);
    const trialTop = centerTop(tR, base);
    const basicBottom = centerBottom(bR, base);
    const trialBottom = centerBottom(tR, base);
    const smartTop = centerTop(sR, base);
    const basicRight = rightMiddle(bR, base);
    const trialLeft = leftMiddle(tR, base);

    const connectors: ConnectorPath[] = [
      // Entry → Basic (left curve)
      { id: "entry-basic", d: cubicD(entryBottom.x, entryBottom.y, basicTop.x, basicTop.y, 0.4, -20), accent: false, dashed: false },

      // Entry → Smart Trial (right curve)
      { id: "entry-trial", d: cubicD(entryBottom.x, entryBottom.y, trialTop.x, trialTop.y, 0.4, 20), accent: true, dashed: false },

      // Basic → Smart Trial (horizontal S-curve, dashed)
      { id: "basic-trial", d: horizontalSCurve(basicRight.x, basicRight.y, trialLeft.x, trialLeft.y), accent: false, dashed: true },

      // Basic → Smart Plan (down, neutral)
      { id: "basic-smart", d: cubicD(basicBottom.x, basicBottom.y, smartTop.x, smartTop.y, 0.55, -10), accent: false, dashed: false },

      // Smart Trial → Smart Plan (down, accent)
      { id: "trial-smart", d: cubicD(trialBottom.x, trialBottom.y, smartTop.x, smartTop.y, 0.55, 10), accent: true, dashed: false },
    ];

    setPaths(connectors);
  }, []);

  useEffect(() => {
    computePaths();
    const ro = new ResizeObserver(computePaths);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [computePaths]);

  return (
    <div ref={containerRef} className="relative mx-auto max-w-3xl px-4">

      {/* ── Keyframe styles ── */}
      <style>{`
        @keyframes kal-flow {
          from { stroke-dashoffset: 60; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes kal-flow-dashed {
          from { stroke-dashoffset: 40; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes kal-arrowpulse {
          0%, 100% { opacity: 0.7; }
          50%       { opacity: 1; }
        }
        .kal-connector { animation: kal-flow 1.8s linear infinite; }
        .kal-connector-dashed { animation: kal-flow-dashed 1.4s linear infinite; }
      `}</style>

      {/* ── SVG overlay ── */}
      {svgSize.w > 0 && (
        <svg
          width={svgSize.w}
          height={svgSize.h}
          className="pointer-events-none absolute left-0 top-0 overflow-visible"
          aria-hidden
        >
          <defs>
            {/* Glow filter for accent lines */}
            <filter id="kal-glow-accent" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Glow filter for neutral lines */}
            <filter id="kal-glow-neutral" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Arrowhead — neutral */}
            <marker
              id="kal-arrow-neutral"
              markerWidth="8"
              markerHeight="8"
              refX="6"
              refY="3"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M0,0 L0,6 L8,3 z" fill="var(--kal-border-strong)" opacity="0.7" />
            </marker>

            {/* Arrowhead — accent */}
            <marker
              id="kal-arrow-accent"
              markerWidth="8"
              markerHeight="8"
              refX="6"
              refY="3"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M0,0 L0,6 L8,3 z" fill="var(--kal-accent)" opacity="0.85"
                style={{ animation: "kal-arrowpulse 2s ease-in-out infinite" }} />
            </marker>
          </defs>

          {paths.map((p) => {
            const color = p.accent ? "var(--kal-accent)" : "var(--kal-border-strong)";
            const opacity = p.accent ? 0.65 : 0.5;
            const strokeWidth = p.accent ? 1.8 : 1.5;
            const dash = p.dashed ? "6 5" : "4 3";
            const dashTotal = p.dashed ? 11 : 7;
            const filterId = p.accent ? "kal-glow-accent" : "kal-glow-neutral";
            const markerId = p.accent ? "kal-arrow-accent" : "kal-arrow-neutral";

            return (
              <g key={p.id}>
                {/* Outer glow pass */}
                <path
                  d={p.d}
                  fill="none"
                  stroke={color}
                  strokeWidth={strokeWidth + 2}
                  strokeOpacity={0.12}
                  strokeDasharray={dash}
                  strokeLinecap="round"
                  filter={`url(#${filterId})`}
                />
                {/* Animated flowing line */}
                <path
                  d={p.d}
                  fill="none"
                  stroke={color}
                  strokeWidth={strokeWidth}
                  strokeOpacity={opacity}
                  strokeDasharray={`${dash}`}
                  strokeDashoffset={0}
                  strokeLinecap="round"
                  markerEnd={`url(#${markerId})`}
                  className={p.dashed ? "kal-connector-dashed" : "kal-connector"}
                  style={{ animationDuration: p.accent ? "1.6s" : "2s", strokeDashoffset: dashTotal }}
                />
              </g>
            );
          })}

        </svg>
      )}

      {/* ── Entry node ── */}
      <div className="flex justify-center">
        <div
          ref={entryRef}
          className="rounded-2xl border-2 border-kal-border-strong bg-kal-card px-8 py-4 text-center shadow-sm"
        >
          <p className="text-xs font-bold uppercase tracking-widest text-kal-muted">You arrive</p>
          <p className="mt-1 text-sm font-medium text-kal-text-secondary">Two ways to start</p>
        </div>
      </div>

      {/* Spacer so SVG has room for the entry→cards curves */}
      <div className="h-10" />

      {/* ── Two plan cards ── */}
      <div className="grid grid-cols-2 gap-4 sm:gap-8">

        {/* Basic Plan */}
        <div
          ref={basicRef}
          className="rounded-2xl border-2 border-kal-border bg-kal-card p-4 shadow-sm"
        >
          <p className="text-center text-[10px] font-bold uppercase tracking-widest text-kal-muted">
            Start free
          </p>
          <p
            className="mt-1 text-center text-lg font-bold text-kal-text"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Basic Plan
          </p>
          <p
            className="text-center text-2xl font-normal text-kal-text"
            style={{ fontFamily: "var(--font-display)" }}
          >
            ₹0
          </p>
          <p className="text-center text-xs text-kal-muted">3 days · No card needed</p>
          <div className="mt-3 space-y-1.5">
            {["Daily planner", "Syllabus tracker", "Focus timer + camera", "Streaks + heatmap", "Doubt tracker"].map(
              (f) => (
                <div key={f} className="flex items-center gap-1.5">
                  <span className="h-1 w-1 shrink-0 rounded-full bg-kal-muted" aria-hidden />
                  <span className="text-xs text-kal-text-secondary">{f}</span>
                </div>
              ),
            )}
          </div>
          <Link
            href="/auth"
            className="mt-4 flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-full border-2 border-kal-border bg-kal-card-muted transition hover:border-kal-accent/50 hover:bg-kal-accent/5"
          >
            <span className="text-xs font-bold text-kal-text">Start free</span>
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
              Free Plan · ₹0
            </span>
          </Link>
          <div className="mt-3 space-y-1.5 border-t border-kal-border/50 pt-3">
            <p className="text-[10px] font-semibold leading-snug text-kal-accent">
              → Want AI first? Try Smart Trial for ₹19
            </p>
            <p className="text-[10px] leading-snug text-kal-muted">
              → Ready to commit? Go straight to Smart Plan
            </p>
          </div>
        </div>

        {/* Smart Trial */}
        <div
          ref={trialRef}
          className="rounded-2xl border-2 border-kal-accent/50 bg-kal-card p-4 shadow-[0_4px_16px_rgba(255,122,0,0.10)]"
        >
          <p className="text-center text-[10px] font-bold uppercase tracking-widest text-kal-accent">
            Start with AI
          </p>
          <p
            className="mt-1 text-center text-lg font-bold text-kal-text"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Smart Trial
          </p>
          <p
            className="text-center text-2xl font-normal text-kal-text"
            style={{ fontFamily: "var(--font-display)" }}
          >
            ₹19
          </p>
          <p className="text-center text-xs text-kal-muted">3 days · See everything</p>
          <div className="mt-3 space-y-1.5">
            {[
              "All Basic features +",
              "Marks engine + rank prediction",
              "Spaced revision engine",
              "PrepBrain AI coach",
              "Voice: 15 min · 5 Lakh tokens",
            ].map((f) => (
              <div key={f} className="flex items-center gap-1.5">
                <span className="h-1 w-1 shrink-0 rounded-full bg-kal-accent/60" aria-hidden />
                <span className="text-xs text-kal-text-secondary">{f}</span>
              </div>
            ))}
          </div>
          <Link
            href="/auth"
            className="mt-4 flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-full bg-kal-accent shadow-[0_4px_12px_rgba(255,122,0,0.28)] transition hover:brightness-105"
          >
            <span className="text-xs font-bold text-white">Start Smart Trial</span>
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              ₹19 · 3-Day Trial
            </span>
          </Link>
          <div className="mt-3 border-t border-kal-accent/20 pt-3">
            <p className="text-center text-[10px] leading-snug text-kal-muted">
              → After 3 days, one path forward: Smart Plan
            </p>
          </div>
        </div>
      </div>

      {/* Spacer for the crossing connectors and down-curves to Smart Plan */}
      <div className="h-20" />

      {/* ── Smart Plan destination ── */}
      <div className="flex justify-center">
        <div
          ref={smartRef}
          className="w-full max-w-sm rounded-2xl border-2 border-kal-accent bg-gradient-to-br from-kal-accent/10 to-kal-card p-5 text-center shadow-[0_8px_32px_rgba(255,122,0,0.18)]"
        >
          <span className="inline-block rounded-full bg-kal-accent px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
            Most Popular
          </span>
          <p
            className="mt-3 text-xl font-bold text-kal-text"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Smart Plan
          </p>
          <div className="mt-1 flex items-baseline justify-center gap-1">
            <span
              className="text-3xl font-normal text-kal-accent"
              style={{ fontFamily: "var(--font-display)" }}
            >
              ₹499
            </span>
            <span className="text-sm text-kal-muted">/month</span>
          </div>
          <div className="mt-3 space-y-1.5">
            {[
              "Every tool, fully unlocked",
              "PrepBrain AI reads your syllabus, marks & doubts",
              "Voice 60 min · 20 Lakh tokens/mo",
              "You choose autopay duration — 1 to 12 months",
            ].map((line) => (
              <div key={line} className="flex items-start gap-2 text-left">
                <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-kal-accent/60" aria-hidden />
                <span className="text-[11px] leading-snug text-kal-text-secondary">{line}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[10px] font-medium text-kal-muted">
            Cancel anytime from settings
          </p>
          <Link
            href="/pricing"
            className="mt-4 flex min-h-[40px] items-center justify-center rounded-full bg-kal-accent text-xs font-bold text-white shadow-[0_4px_12px_rgba(255,122,0,0.28)] transition hover:brightness-105"
          >
            Choose Smart Plan
          </Link>
        </div>
      </div>

      <p className="mt-5 text-center text-xs text-kal-muted">
        Both paths lead here. The trial just lets you verify it&apos;s worth it first.
      </p>
    </div>
  );
}
