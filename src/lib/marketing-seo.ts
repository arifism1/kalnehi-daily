import type { Metadata } from "next";

import { absoluteUrl } from "@/lib/site";
import {
  OG_IMAGE_HEIGHT,
  OG_IMAGE_PATH,
  OG_IMAGE_WIDTH,
  SITE_NAME,
  SITE_TAGLINE,
} from "@/lib/seo-metadata";

/** `title` is the full document title (include brand if you want it in the tab). */
export function marketingPageMetadata(input: {
  path: string;
  title: string;
  description: string;
}): Metadata {
  const url = absoluteUrl(input.path);
  const ogImage = absoluteUrl(OG_IMAGE_PATH);

  return {
    title: { absolute: input.title },
    description: input.description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      title: input.title,
      description: input.description,
      siteName: SITE_NAME,
      locale: "en_IN",
      images: [
        {
          url: ogImage,
          width: OG_IMAGE_WIDTH,
          height: OG_IMAGE_HEIGHT,
          alt: `${SITE_NAME} — ${SITE_TAGLINE}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      images: [ogImage],
    },
    robots: { index: true, follow: true },
  };
}
