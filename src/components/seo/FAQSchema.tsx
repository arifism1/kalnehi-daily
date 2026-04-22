import { FAQBlock, type FAQItem } from "@/components/marketing/FAQBlock";

type Props = {
  items: FAQItem[];
  title?: string;
};

/** Re-use the same `items` in `MarketingPageJsonLd` `faqs` for FAQPage JSON-LD. */

/**
 * FAQ accordion for rich results: pair with `MarketingPageJsonLd` `faqs` prop
 * (FAQPage JSON-LD is emitted there).
 */
export function FAQSchema({ items, title }: Props) {
  return <FAQBlock items={items} title={title} />;
}
