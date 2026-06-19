import { fizakiConfig } from "@/verticals/fizaki.config";

const t = fizakiConfig.brand.theme;

/** Scoped CSS that re-themes shared --kal-* tokens to the FIZAKI palette. */
export const FIZAKI_THEME_CSS = `[data-vertical="fizaki"]{
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

/**
 * Wraps children in FIZAKI-themed scope. Reused by the app route group and the
 * public landing shell so the indigo palette is defined in one place.
 */
export function FizakiThemeScope({
  children,
  className = "bg-kal-page text-kal-text",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: FIZAKI_THEME_CSS }} />
      <div data-vertical="fizaki" className={className}>
        {children}
      </div>
    </>
  );
}
