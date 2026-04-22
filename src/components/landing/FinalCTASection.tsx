import Link from "next/link";

export function FinalCTASection() {
  return (
    <section className="bg-kal-page-end py-24 lg:py-32">
      <div className="mx-auto max-w-4xl px-6 text-center sm:px-8 lg:px-12">
        <h2
          className="mb-8 text-4xl font-normal leading-[1.05] tracking-tight text-kal-text sm:text-5xl lg:text-6xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Start free — no card needed.
        </h2>

        <div className="flex flex-col items-center gap-4">
          <Link
            href="/auth"
            className="inline-flex min-h-[56px] items-center justify-center rounded-full bg-kal-accent px-10 text-base font-bold text-white shadow-[0_4px_24px_rgba(255,122,0,0.35)] transition hover:brightness-105 active:scale-[0.99]"
          >
            Get started free
          </Link>
          <p className="text-sm text-kal-muted">
            1 free day · ₹19 for 2 more · ₹299/month after. Cancel anytime.
          </p>
        </div>
      </div>
    </section>
  );
}
