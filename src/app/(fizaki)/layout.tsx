import { ProtectedLayout } from "@/components/ProtectedLayout";
import { FizakiChrome } from "@/components/fizaki/FizakiChrome";
import { FizakiThemeScope } from "@/components/fizaki/FizakiThemeScope";
import { resolveFizakiRole } from "@/lib/fizaki/serverRole";
import { requireVertical } from "@/lib/vertical/verticalGuard";

import "@/app/globals.css";

/**
 * FIZAKI route group. Re-themes the shared --kal-* design tokens to the FIZAKI palette
 * (scoped to [data-vertical="fizaki"]) so every shared engine component rebrands with no
 * forked styling. Guards that the host actually resolved to the FIZAKI vertical.
 */
export default async function FizakiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireVertical("fizaki");
  const role = await resolveFizakiRole();

  return (
    <ProtectedLayout>
      <FizakiThemeScope>
        <FizakiChrome role={role}>{children}</FizakiChrome>
      </FizakiThemeScope>
    </ProtectedLayout>
  );
}
