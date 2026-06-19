"use client";

import { useState } from "react";

import { FIZAKI_DEMO_FORM } from "@/components/fizaki/landing/copy";

type FormState = "idle" | "submitting" | "success" | "error";

export function BookDemoForm() {
  const [state, setState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("submitting");
    setErrorMsg(null);

    const form = e.currentTarget;
    const fd = new FormData(form);
    const payload = {
      name: String(fd.get("name") ?? ""),
      email: String(fd.get("email") ?? ""),
      company: String(fd.get("company") ?? ""),
      teamSize: String(fd.get("teamSize") ?? ""),
      message: String(fd.get("message") ?? ""),
      form_hp: String(fd.get("form_hp") ?? ""),
    };

    try {
      const res = await fetch("/api/fizaki/demo-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setErrorMsg(data.error ?? FIZAKI_DEMO_FORM.error);
        setState("error");
        return;
      }
      setState("success");
      form.reset();
    } catch {
      setErrorMsg(FIZAKI_DEMO_FORM.error);
      setState("error");
    }
  }

  if (state === "success") {
    return (
      <div
        className="rounded-2xl border border-kal-success-border bg-kal-success-soft px-6 py-8 text-center"
        role="status"
      >
        <p className="text-base font-semibold text-kal-success-text">
          {FIZAKI_DEMO_FORM.success}
        </p>
        <button
          type="button"
          onClick={() => setState("idle")}
          className="mt-4 text-sm font-medium text-kal-accent hover:underline"
        >
          Submit another request
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Honeypot — hidden from users */}
      <input
        type="text"
        name="form_hp"
        tabIndex={-1}
        autoComplete="off"
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
        aria-hidden
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-kal-muted">
            {FIZAKI_DEMO_FORM.fields.name}
          </span>
          <input
            name="name"
            required
            maxLength={120}
            autoComplete="name"
            className="w-full rounded-xl border border-kal-border bg-kal-card px-4 py-3 text-sm text-kal-text outline-none focus:border-kal-accent"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-kal-muted">
            {FIZAKI_DEMO_FORM.fields.email}
          </span>
          <input
            name="email"
            type="email"
            required
            maxLength={320}
            autoComplete="email"
            className="w-full rounded-xl border border-kal-border bg-kal-card px-4 py-3 text-sm text-kal-text outline-none focus:border-kal-accent"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-kal-muted">
            {FIZAKI_DEMO_FORM.fields.company}
          </span>
          <input
            name="company"
            required
            maxLength={160}
            autoComplete="organization"
            className="w-full rounded-xl border border-kal-border bg-kal-card px-4 py-3 text-sm text-kal-text outline-none focus:border-kal-accent"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-kal-muted">
            {FIZAKI_DEMO_FORM.fields.teamSize}
          </span>
          <input
            name="teamSize"
            maxLength={40}
            placeholder="e.g. 12 reps"
            className="w-full rounded-xl border border-kal-border bg-kal-card px-4 py-3 text-sm text-kal-text outline-none focus:border-kal-accent"
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-kal-muted">
          {FIZAKI_DEMO_FORM.fields.message}
        </span>
        <textarea
          name="message"
          rows={3}
          maxLength={2000}
          className="w-full rounded-xl border border-kal-border bg-kal-card px-4 py-3 text-sm text-kal-text outline-none focus:border-kal-accent"
        />
      </label>

      {state === "error" && errorMsg && (
        <p className="text-sm text-kal-danger-text" role="alert">
          {errorMsg}
        </p>
      )}

      <button
        type="submit"
        disabled={state === "submitting"}
        className="w-full rounded-full bg-kal-accent px-6 py-3.5 text-sm font-bold text-kal-accent-foreground shadow-[0_4px_16px_rgba(59,77,219,0.28)] transition hover:brightness-105 disabled:opacity-60"
      >
        {state === "submitting" ? "Sending…" : FIZAKI_DEMO_FORM.submit}
      </button>
    </form>
  );
}
