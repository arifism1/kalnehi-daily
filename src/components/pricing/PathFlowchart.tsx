"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

/* ─── Types ─────────────────────────────────────────────────────────── */

interface ConnectorPath {
  id: string;
  d: string;
  accent: boolean;
}

/* ─── Geometry helpers ───────────────────────────────────────────────── */

function centerBottom(r: DOMRect, base: DOMRect) {
  return { x: r.left - base.left + r.width / 2, y: r.bottom - base.top };
}
function centerTop(r: DOMRect, base: DOMRect) {
  return { x: r.left - base.left + r.width / 2, y: r.top - base.top };
}

function cubicD(x1: number, y1: number, x2: number, y2: number, cpStrength = 0.5) {
  const dy = y2 - y1;
  const cp1y = y1 + dy * cpStrength;
  const cp2y = y2 - dy * cpStrength;
  return `M ${x1} ${y1} C ${x1} ${cp1y}, ${x2} ${cp2y}, ${x2} ${y2}`;
}

/* ─── Main component ─────────────────────────────────────────────────── */

export function PathFlowchart() {
  const containerRef = useRef<HTMLDivElement>(null);
  const trialRef = useRef<HTMLDivElement>(null);
  const smartRef = useRef<HTMLDivElement>(null);

  const [paths, setPaths] = useState<ConnectorPath[]>([]);
  const [svgSize, setSvgSize] = useState({ w: 0, h: 0 });

  const computePaths = useCallback(() => {
    const container = containerRef.current;
    const trial = trialRef.current;
    const smart = smartRef.current;
    if (!container || !trial || !smart) return;

    const base = container.getBoundingClientRect();
    const tR = trial.getBoundingClientRect();
    const sR = smart.getBoundingClientRect();

    setSvgSize({ w: base.width, h: base.height });

    const trialBottom = centerBottom(tR, base);
    const smartTop = centerTop(sR, base);

    const connectors: ConnectorPath[] = [
      {
        id: "trial-smart",
        d: cubicD(trialBottom.x, trialBottom.y, smartTop.x, smartTop.y, 0.5),
        accent: true,
      },
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
    <div ref={containerRef} className="relative mx-auto max-w-sm px-4">
      <style>{`
        @keyframes kal-flow {
          from { stroke-dashoffset: 60; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes kal-arrowpulse {
          0%, 100% { opacity: 0.7; }
          50%       { opacity: 1; }
        }
        .kal-connector { animation: kal-flow 1.6s linear infinite; }
      `}</style>

      {/* SVG overlay */}
      {svgSize.w > 0 && (
        <svg
          width={svgSize.w}
          height={svgSize.h}
          className="pointer-events-none absolute left-0 top-0 overflow-visible"
          aria-hidden
        >
          <defs>
            <filter id="kal-glow-accent" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <marker
              id="kal-arrow-accent"
              markerWidth="8"
              markerHeight="8"
              refX="6"
              refY="3"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path
                d="M0,0 L0,6 L8,3 z"
                fill="var(--kal-accent)"
                opacity="0.85"
                style={{ animation: "kal-arrowpulse 2s ease-in-out infinite" }}
              />
            </marker>
          </defs>

          {paths.map((p) => (
            <g key={p.id}>
              <path
                d={p.d}
                fill="none"
                stroke="var(--kal-accent)"
                strokeWidth={3.5}
                strokeOpacity={0.12}
                strokeDasharray="4 3"
                strokeLinecap="round"
                filter="url(#kal-glow-accent)"
              />
              <path
                d={p.d}
                fill="none"
                stroke="var(--kal-accent)"
                strokeWidth={1.8}
                strokeOpacity={0.65}
                strokeDasharray="4 3"
                strokeLinecap="round"
                markerEnd="url(#kal-arrow-accent)"
                className="kal-connector"
                style={{ strokeDashoffset: 7 }}
              />
            </g>
          ))}
        </svg>
      )}

      {/* 3-Day Free Trial node */}
      <div
        ref={trialRef}
        className="rounded-2xl border-2 border-kal-border bg-kal-card p-5 text-center shadow-sm"
      >
        <span className="inline-block rounded-full bg-emerald-500/15 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
          Start here
        </span>
        <p
          className="mt-2 text-xl font-bold text-kal-text"
          style={{ fontFamily: "var(--font-display)" }}
        >
          3-Day Free Trial
        </p>
        <p
          className="text-2xl font-normal text-kal-text"
          style={{ fontFamily: "var(--font-display)" }}
        >
          ₹0
        </p>
        <p className="text-xs text-kal-muted">No credit card needed</p>
        <div className="mt-3 space-y-1.5 text-left">
          {[
            "Every feature fully unlocked",
            "PrepBrain AI — 60,000 tokens",
            "Voice control — 12 minutes",
          ].map((f) => (
            <div key={f} className="flex items-center gap-1.5">
              <span className="h-1 w-1 shrink-0 rounded-full bg-emerald-500/70" aria-hidden />
              <span className="text-xs text-kal-text-secondary">{f}</span>
            </div>
          ))}
        </div>
        <Link
          href="/auth"
          className="mt-4 flex min-h-[44px] items-center justify-center rounded-full border-2 border-kal-border bg-kal-card-muted transition hover:border-kal-accent/50 hover:bg-kal-accent/5"
        >
          <span className="text-xs font-bold text-kal-text">Start free trial — ₹0</span>
        </Link>
      </div>

      {/* Spacer */}
      <div className="h-16" />

      {/* Smart Plan destination */}
      <div
        ref={smartRef}
        className="rounded-2xl border-2 border-kal-accent bg-gradient-to-br from-kal-accent/10 to-kal-card p-5 text-center shadow-[0_8px_32px_rgba(255,122,0,0.18)]"
      >
        <span className="inline-block rounded-full bg-kal-accent px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
          Smart Plan
        </span>
        <p
          className="mt-2 text-xl font-bold text-kal-text"
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
        <div className="mt-3 space-y-1.5 text-left">
          {[
            "Everything in the trial, every month",
            "PrepBrain AI — 20 lakh tokens/month",
            "Voice control — 100 minutes/month",
            "AutoPay — cancel anytime",
          ].map((line) => (
            <div key={line} className="flex items-start gap-2">
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-kal-accent/60" aria-hidden />
              <span className="text-[11px] leading-snug text-kal-text-secondary">{line}</span>
            </div>
          ))}
        </div>
        <Link
          href="#subscribe"
          className="mt-4 flex min-h-[40px] items-center justify-center rounded-full bg-kal-accent text-xs font-bold text-white shadow-[0_4px_12px_rgba(255,122,0,0.28)] transition hover:brightness-105"
        >
          Subscribe — ₹499/month
        </Link>
      </div>

      <p className="mt-5 text-center text-xs text-kal-muted">
        Start free. Subscribe when you&apos;re ready.
      </p>
    </div>
  );
}
