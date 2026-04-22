import Link from "next/link";
import { KalnehiMark } from "@/components/KalnehiMark";

const FOOTER_LINKS = {
  Exams: [
    { href: "/jee", label: "JEE" },
    { href: "/neet", label: "NEET" },
    { href: "/upsc", label: "UPSC" },
    { href: "/cat", label: "CAT" },
    { href: "/gate", label: "GATE" },
    { href: "/ca-intermediate", label: "CA Intermediate" },
    { href: "/clat", label: "CLAT" },
    { href: "/ssc-cgl", label: "SSC CGL" },
    { href: "/ibps-po", label: "IBPS PO" },
    { href: "/nda", label: "NDA" },
    { href: "/cuet", label: "CUET" },
    { href: "/cbse-class-12", label: "CBSE Class 12" },
  ],
  Features: [
    { href: "/features", label: "All Features" },
    { href: "/features/prepbrain-ai", label: "PrepBrain AI" },
    { href: "/features/voice-control", label: "Voice Control" },
    { href: "/features/syllabus-tracker", label: "Syllabus Tracker" },
    { href: "/features/spaced-revision", label: "Spaced Revision" },
    { href: "/features/marks-engine", label: "Marks Engine" },
    { href: "/features/study-timer", label: "Study Timer" },
    { href: "/features/consistency-tracker", label: "Consistency Tracker" },
    { href: "/tools", label: "Free Tools" },
    { href: "/blog", label: "Blog" },
    { href: "/guides", label: "Guides" },
    { href: "/pricing", label: "Pricing" },
  ],
  Resources: [
    { href: "/about", label: "About" },
    { href: "/changelog", label: "Changelog" },
    { href: "/contact", label: "Contact" },
    { href: "/for/jee-droppers", label: "For JEE Droppers" },
    { href: "/for/neet-droppers", label: "For NEET Droppers" },
    { href: "/for/upsc-working-professionals", label: "For Working Professionals" },
    { href: "/vs/notion", label: "vs Notion" },
    { href: "/vs/google-calendar", label: "vs Google Calendar" },
    { href: "/syllabus/jee-main", label: "JEE Main Syllabus" },
    { href: "/syllabus/neet", label: "NEET Syllabus" },
    { href: "/syllabus/upsc-cse", label: "UPSC Syllabus" },
    { href: "/auth", label: "Start free — 3 days on us" },
  ],
  Legal: [
    { href: "/privacy", label: "Privacy Policy" },
    { href: "/terms", label: "Terms of Service" },
    { href: "/refund", label: "Refund Policy" },
    { href: "/shipping", label: "Shipping Policy" },
  ],
} as const;

export function LandingFooter() {
  return (
    <footer className="border-t border-kal-border bg-kal-page-end">
      <div className="mx-auto max-w-7xl px-6 py-16 sm:px-8 lg:px-12">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-4 lg:gap-16">
          {(Object.entries(FOOTER_LINKS) as [string, readonly { href: string; label: string }[]][]).map(
            ([section, links]) => (
              <div key={section}>
                <h3 className="mb-4 text-[10px] font-bold uppercase tracking-widest text-kal-muted">
                  {section}
                </h3>
                <ul className="space-y-2.5">
                  {links.map(({ href, label }) => (
                    <li key={href}>
                      <Link
                        href={href}
                        className="text-sm font-medium text-kal-text-secondary transition-colors hover:text-kal-text"
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ),
          )}
        </div>

        <div className="mt-14 flex flex-col items-start gap-4 border-t border-[rgba(210,192,168,0.4)] pt-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <KalnehiMark
              aria-hidden
              className="h-7 w-auto max-w-[6.5rem] object-contain object-left opacity-80"
            />
            <span className="text-xs text-kal-muted">
              Made in Bengaluru for aspirants in India and worldwide
            </span>
          </div>
          <p className="text-xs text-kal-muted">
            © {new Date().getFullYear()} Kalnehi Daily. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
