import Link from "next/link";
import { KalnehiMark } from "@/components/KalnehiMark";

const FOOTER_LINKS = {
  Product: [
    { href: "#features", label: "Features" },
    { href: "#pricing", label: "Pricing" },
    { href: "/what-can-kalnehi-do", label: "What Can Kalnehi Do?" },
    { href: "/best-study-practices", label: "Best Study Practices" },
    { href: "/guides", label: "Guides" },
    { href: "/brain-yoga", label: "Brain Yoga" },
    { href: "/auth", label: "Start free — 1 day on us" },
  ],
  Exams: [
    { href: "/jee-study-planner", label: "JEE Planner" },
    { href: "/neet-study-planner", label: "NEET Planner" },
    { href: "/upsc-study-planner", label: "UPSC Planner" },
    { href: "/cuet-ug-study-planner", label: "CUET UG Planner" },
    { href: "/boards-study-planner", label: "Boards Planner" },
    { href: "/neet-pg-study-planner", label: "NEET PG Planner" },
  ],
  Company: [
    { href: "/about", label: "About" },
    { href: "/pricing", label: "Pricing" },
    { href: "/guides", label: "Blog & Guides" },
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
    <footer className="border-t border-[rgba(210,192,168,0.4)] bg-[#F0EDE6]">
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
