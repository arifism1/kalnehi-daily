"use client";

const TOPICS = [
  { id: "support", label: "Technical support" },
  { id: "billing", label: "Billing or subscription" },
  { id: "feedback", label: "Product feedback" },
  { id: "feature", label: "Feature request" },
  { id: "other", label: "Something else" },
];

export function ContactForm() {
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const subject = encodeURIComponent(`[Kalnehi Daily] ${data.get("topic") || "Contact"}`);
    const body = encodeURIComponent((data.get("message") as string) || "");
    window.location.href = `mailto:curioversitylearning@gmail.com?subject=${subject}&body=${body}`;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="topic" className="text-xs font-semibold text-kal-text-secondary uppercase tracking-wide">
          Topic
        </label>
        <select
          id="topic"
          name="topic"
          className="w-full rounded-xl border border-kal-border bg-kal-card px-3 py-2 text-sm text-kal-text focus:border-kal-accent/60 focus:outline-none"
        >
          {TOPICS.map((t) => (
            <option key={t.id} value={t.label}>{t.label}</option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="message" className="text-xs font-semibold text-kal-text-secondary uppercase tracking-wide">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          rows={5}
          placeholder="Describe your issue or question in detail. The more context you give, the faster we can help."
          className="w-full rounded-xl border border-kal-border bg-kal-card px-3 py-2 text-sm text-kal-text placeholder:text-kal-muted focus:border-kal-accent/60 focus:outline-none resize-none"
        />
      </div>
      <button
        type="submit"
        className="w-full min-h-[44px] rounded-full bg-kal-accent text-sm font-bold text-white transition hover:brightness-105"
      >
        Open email client →
      </button>
    </form>
  );
}
