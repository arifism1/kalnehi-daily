import { absoluteUrl, getSiteUrl } from "@/lib/site";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/seo-metadata";

/**
 * Organization + WebSite + SoftwareApplication for Google rich results & Knowledge Graph hints.
 */
export function JsonLd() {
  const site = getSiteUrl();
  const logo = absoluteUrl("/icon-512x512.png");

  const graph = [
    {
      "@type": "Organization",
      "@id": `${site}/#organization`,
      name: SITE_NAME,
      url: site,
      logo: {
        "@type": "ImageObject",
        url: logo,
        width: 512,
        height: 512,
      },
      description: SITE_TAGLINE,
    },
    {
      "@type": "WebSite",
      "@id": `${site}/#website`,
      name: SITE_NAME,
      url: site,
      description:
        `${SITE_NAME}: daily execution planner and installable PWA for Smart Exam Prep — syllabus, habits, study sessions, and optional AI coaching.`,
      publisher: { "@id": `${site}/#organization` },
      inLanguage: "en-IN",
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${site}/#app`,
      name: SITE_NAME,
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web",
      browserRequirements: "Requires JavaScript. Requires HTML5.",
      image: logo,
      description:
        `Install ${SITE_NAME} as a Progressive Web App on Android and desktop. Planner, syllabus tracking, study sessions, Smart Exam Prep workflows, and PrepBrain AI (on Pro).`,
      url: site,
      author: { "@id": `${site}/#organization` },
    },
  ];

  const json = {
    "@context": "https://schema.org",
    "@graph": graph,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}
