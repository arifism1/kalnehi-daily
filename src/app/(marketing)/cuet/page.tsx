import Link from "next/link";
import { CTABanner } from "@/components/marketing/CTABanner";
import { ExamHero } from "@/components/marketing/ExamHero";
import { FAQBlock } from "@/components/marketing/FAQBlock";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { MarketingPageJsonLd } from "@/components/seo/MarketingPageJsonLd";
import { marketingPageMetadata } from "@/lib/marketing-seo";
import { SITE_NAME } from "@/lib/seo-metadata";

export const metadata = marketingPageMetadata({
  path: "/cuet",
  title: `Daily Planner for CUET Preparation | ${SITE_NAME}`,
  description: `CUET has General Test, Domain Subjects and Language papers. Kalnehi tracks your subject-wise progress, plans your daily study, and helps Mastermind identify which CUET subjects need more time.`,
});

const FAQS = [
  { question: "What is the CUET exam structure?", answer: "CUET (Common University Entrance Test) has three sections: Section IA/IB — Language (from 33 languages, choose one); Section II — Domain Subjects (27 subjects, choose up to 6 based on your target course); Section III — General Test (optional, required by some universities). Marks depend on which universities and courses you're applying for." },
  { question: "Which universities accept CUET scores?", answer: "All Central Universities (DU, JNU, BHU, Hyderabad University, etc.), several State Universities, and private universities including Sharda, Tezpur, and more. Over 200 universities accept CUET scores. DU is the most competitive — some courses require near-perfect scores." },
  { question: "How does Kalnehi help CUET aspirants?", answer: "Track your domain subject preparation in Kalnehi — which chapters from your chosen subjects (e.g. Economics, History, Political Science) are done vs pending. Mastermind monitors your mock scores and tells you which subject to prioritise." },
  { question: "How many domain subjects should I choose for CUET?", answer: "Choose domain subjects based on the courses you want to apply for. For DU BA (H) Economics, you'd typically choose Economics + Mathematics + General Test. Kalnehi tracks your preparation for each chosen domain subject separately." },
];

export default function CuetPage() {
  return (
    <>
      <MarketingPageJsonLd
        breadcrumbs={[{ name: "Home", path: "/" }, { name: "CUET Preparation", path: "/cuet" }]}
        faqs={FAQS}
      />

      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "CUET Preparation", path: "/cuet" }]} className="mb-2" />
      <article className="space-y-10">
        <ExamHero
          badge="CUET — Common University Entrance Test"
          headline="CUET Preparation Daily Planner — Track Every Domain Subject, Secure Your Central University Seat"
          subheadline="CUET has replaced Class 12 marks as the admission criterion for Central Universities. For DU and JNU, even 95% in Boards isn't enough — you need a near-perfect CUET score in your chosen domains. Kalnehi tracks every chapter."
        />

        <section className="space-y-3" aria-labelledby="cuet-how">
          <h2 id="cuet-how" className="text-xl font-bold text-kal-text">How Kalnehi helps CUET aspirants</h2>
          <ul className="space-y-3 text-sm">
            {[
              { t: "Multi-domain subject tracking", d: "Track your preparation across all chosen domain subjects (Economics, History, Mathematics, Political Science, etc.) simultaneously. Mastermind monitors which subject has the lowest completion and tells you to shift focus." },
              { t: "NCERT-aligned syllabus tracking", d: "CUET domain questions are largely NCERT-based (Class 12). Kalnehi maps your NCERT chapter completion for each subject and flags incomplete chapters before your exam." },
              { t: "Mock score analysis", d: "Log your CUET mock scores section-wise. Mastermind tracks your accuracy per domain subject and tells you which chapters within each subject are your weakest based on your test performance." },
            ].map(({ t, d }) => (
              <div key={t} className="kal-glass-card rounded-xl p-4">
                <strong className="text-kal-text block mb-1">{t}</strong>
                <p className="text-kal-text-secondary">{d}</p>
              </div>
            ))}
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-kal-text">Related pages</h2>
          <ul className="space-y-1 text-sm">
            <li><Link href="/cbse-class-12" className="font-medium text-kal-accent-dark hover:underline">CBSE Class 12 Boards preparation →</Link></li>
            <li><Link href="/blog/class-12-boards-jee-neet-balance" className="font-medium text-kal-accent-dark hover:underline">How to balance Boards and entrance exams →</Link></li>
          </ul>
        </section>

        <FAQBlock items={FAQS} />
        <CTABanner headline="Track your CUET domain subjects in Kalnehi" subtext="3 days free. Mastermind. No credit card." />
      </article>
    </>
  );
}
