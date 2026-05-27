import { ActiveTimeTracker } from "@/components/ActiveTimeTracker";
import { KalnehiChrome } from "@/components/KalnehiChrome";
import { OrgContextProvider } from "@/components/OrgContextProvider";
import { ProtectedLayout } from "@/components/ProtectedLayout";
import { ContactSupportProvider } from "@/components/support/ContactSupportProvider";
import { SyncProvider } from "@/components/SyncProvider";
import { PwaTracker } from "@/components/PwaTracker";
import { ActivityTracker } from "@/components/ActivityTracker";
import { getOrgIdFromSession } from "@/lib/auth/withOrganization";
import { getStudentOrgSummary } from "@/lib/studentOrgContext";

import "@/app/branding.css";

export default async function KalnehiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const orgId = await getOrgIdFromSession();
  // getStudentOrgSummary is cached per-request (React cache()), so calling it
  // here costs at most one DB round-trip for the entire layout render tree.
  const orgSummary = orgId ? await getStudentOrgSummary(orgId) : null;

  return (
    <ProtectedLayout>
      {/* Dynamic white-labeling: CSS variable overrides generated at render
          time from the org's DB colors. Updating org colors in the admin panel
          takes effect on the student's next page load — no redeploy needed. */}
      {orgSummary?.orgSlug && (
        <style
          dangerouslySetInnerHTML={{
            __html: `[data-org="${orgSummary.orgSlug}"]{--kal-accent:${orgSummary.primaryColor};--kal-accent-hover:${orgSummary.primaryColor}cc;--kal-accent-soft:${orgSummary.accentColor};--kal-page:${orgSummary.accentColor};}`,
          }}
        />
      )}
      <OrgContextProvider value={orgSummary}>
        <div data-org={orgSummary?.orgSlug ?? ""}>
          <SyncProvider>
            <ContactSupportProvider>
              <PwaTracker />
              <ActivityTracker />
              <ActiveTimeTracker />
              <KalnehiChrome>{children}</KalnehiChrome>
            </ContactSupportProvider>
          </SyncProvider>
        </div>
      </OrgContextProvider>
    </ProtectedLayout>
  );
}
