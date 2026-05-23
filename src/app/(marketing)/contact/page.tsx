import { marketingPageMetadata } from "@/lib/marketing-seo";
import { SITE_NAME } from "@/lib/seo-metadata";
import Link from "next/link";
import { ContactForm } from "@/components/marketing/ContactForm";

export const metadata = marketingPageMetadata({
  path: "/contact",
  title: `Contact Kalnehi Daily | ${SITE_NAME}`,
  description: `Reach the Kalnehi Daily team for support, feedback, feature requests, or billing questions. We read and respond to every message.`,
});

export default function ContactPage() {
  return (
    <div className="space-y-12">
      <header className="space-y-3">
        <p className="inline-flex items-center gap-1.5 rounded-full border border-kal-accent/25 bg-kal-accent-soft px-3 py-1 text-xs font-bold uppercase tracking-wide text-kal-accent-dark">
          <span className="size-1.5 rounded-full bg-kal-accent" aria-hidden />
          Contact
        </p>
        <h1 className="kal-feature-title">Get in touch</h1>
        <p className="max-w-xl text-sm leading-relaxed text-kal-text-secondary">
          We read every message. Response times are typically within 24 hours on weekdays.
        </p>
      </header>

      <div className="grid gap-8 sm:grid-cols-2">
        <section className="space-y-4">
          <h2 className="text-base font-semibold text-kal-text">Quick links</h2>
          <div className="space-y-3">
            {[
              { label: "Email support", href: "mailto:curioversitylearning@gmail.com", description: "curioversitylearning@gmail.com — fastest for account and billing issues" },
              { label: "Pricing and plans", href: "/pricing", description: "Compare plans, see what's included in the free trial" },
              { label: "Product changelog", href: "/changelog", description: "What's new — features added, bugs fixed, improvements made" },
              { label: "Privacy policy", href: "/privacy", description: "What data we collect, how we use it, how to delete it" },
            ].map((item) => (
              <div key={item.label} className="kal-glass-card rounded-xl p-4 space-y-0.5">
                <Link
                  href={item.href}
                  className="text-sm font-semibold text-kal-accent-dark hover:underline underline-offset-2"
                >
                  {item.label} →
                </Link>
                <p className="text-xs text-kal-muted">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-base font-semibold text-kal-text">Send a message</h2>
          <ContactForm />
          <p className="text-xs text-kal-muted">
            This opens your email client. Or email us directly at{" "}
            <a href="mailto:curioversitylearning@gmail.com" className="text-kal-accent-dark hover:underline">
              curioversitylearning@gmail.com
            </a>
            .
          </p>
        </section>
      </div>

      <section className="rounded-2xl border border-kal-border bg-kal-card p-5 space-y-3">
        <h2 className="text-sm font-semibold text-kal-text">Common questions answered</h2>
        <div className="space-y-3">
          {[
            { q: "How do I cancel my subscription?", a: "Go to Settings → Subscription → Cancel. Your access continues until the end of the billing period. No questions asked." },
            { q: "Can I get a refund?", a: "All purchases are final and non-refundable except where law requires otherwise. You can cancel the 7-day free trial before it converts to avoid any charge. See our Refund Policy for details." },
            { q: "Is my data safe if I cancel?", a: "Yes. Your data is retained for 90 days after cancellation. For a full export or deletion of your account data, email curioversitylearning@gmail.com from your registered address or visit our account deletion page." },
            { q: "I forgot my password. What do I do?", a: "Use 'Forgot password' on the sign-in page. A reset link is sent to your registered email within 2 minutes." },
          ].map((item) => (
            <div key={item.q} className="space-y-1 border-b border-kal-border last:border-0 pb-3 last:pb-0">
              <p className="text-xs font-semibold text-kal-text">{item.q}</p>
              <p className="text-xs text-kal-text-secondary leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
