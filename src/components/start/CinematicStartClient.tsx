"use client";

import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { triggerConfetti } from "@/components/ui/ConfettiBlast";
import { SITE_NAME } from "@/lib/seo-metadata";

const words = "Your mission: show up, execute, and outlast.";

/**
 * Cinematic first-open: motion + a tiny mission promise before sign-up.
 */
export function CinematicStartClient() {
  const reduce = useReducedMotion();
  const [showConfetti, setShowConfetti] = useState(false);
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="flex w-full max-w-sm flex-col items-center gap-4 text-center"
    >
      <motion.div
        initial={reduce ? false : { scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 22 }}
        className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-[rgba(255,252,248,0.95)] shadow-sm ring-2 ring-kal-accent/20"
      >
        <Image
          src="/icon-192x192.png"
          alt=""
          width={64}
          height={64}
          className="size-16 object-contain"
        />
      </motion.div>
      <div>
        <h1 className="kal-feature-title text-balance">{SITE_NAME}</h1>
        <p className="mt-2 text-balance text-sm leading-relaxed text-kal-muted">
          AI-powered — but the mission is human: your rank, your exam, your discipline.
        </p>
      </div>
      <motion.p
        className="min-h-[3rem] text-sm font-semibold text-kal-text"
        initial={false}
        animate={showConfetti ? { scale: [1, 1.02, 1] } : {}}
        transition={{ duration: 0.4 }}
      >
        {words.split(" ").map((w, i) => (
          <motion.span
            key={`${i}-${w}`}
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 * i, duration: 0.2 }}
            className="inline-block mr-1.5"
          >
            {w}
          </motion.span>
        ))}
      </motion.p>
      <div className="flex w-full flex-col gap-3">
        <Link
          href="/auth?mode=signup"
          onClick={() => {
            if (!showConfetti) {
              setShowConfetti(true);
              triggerConfetti("medium");
            }
          }}
          className="flex h-11 w-full items-center justify-center rounded-xl bg-kal-accent px-6 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 active:opacity-80"
        >
          Create free account
        </Link>
        <Link
          href="/auth?mode=login"
          className="flex h-11 w-full items-center justify-center rounded-xl border border-kal-border bg-kal-card px-6 text-sm font-medium text-kal-text-secondary transition-colors hover:text-kal-text"
        >
          Already have an account? Sign in
        </Link>
      </div>
    </motion.div>
  );
}
