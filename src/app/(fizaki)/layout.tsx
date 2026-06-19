import { ProtectedLayout } from "@/components/ProtectedLayout";
import { FizakiChrome } from "@/components/fizaki/FizakiChrome";
import { resolveFizakiRole } from "@/lib/fizaki/serverRole";
import { requireVertical } from "@/lib/vertical/verticalGuard";
import { fizakiConfig } from "@/verticals/fizaki.config";

import "@/app/globals.css";

/**
 * FIZAKI route group. Re-themes the shared --kal-* design tokens to the FIZAKI palette
 * (scoped to [data-vertical="fizaki"]) so every shared engine component rebrands with no
 * forked styling. Guards that the host actually resolved to the FIZAKI vertical.
 */
const t = fizakiConfig.brand.theme;
const FIZAKI_THEME_CSS = `[data-vertical="fizaki"]{
  --kal-page:${t.backgroundColor};
  --kal-page-end:#EEF1F7;
  --kal-card:rgba(255,255,255,0.9);
  --kal-card-muted:rgba(238,241,247,0.75);
  --kal-border:rgba(59,77,219,0.18);
  --kal-border-strong:rgba(59,77,219,0.32);
  --kal-accent:${t.primaryColor};
  --kal-accent-hover:${t.primaryColor}cc;
  --kal-accent-soft:#EEF0FD;
  --kal-accent-foreground:#ffffff;
  --kal-accent-dark:#28349A;
  --kal-primary:${t.primaryColor};
  --kal-bg:${t.backgroundColor};
  --background:${t.backgroundColor};
}`;

export default async function FizakiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireVertical("fizaki");
  const role = await resolveFizakiRole();

  return (
    <ProtectedLayout>
      <style dangerouslySetInnerHTML={{ __html: FIZAKI_THEME_CSS }} />
      <div data-vertical="fizaki" className="bg-kal-page text-kal-text">
        <FizakiChrome role={role}>{children}</FizakiChrome>
      </div>
    </ProtectedLayout>
  );
}
