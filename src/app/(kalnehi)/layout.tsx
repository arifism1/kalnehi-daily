import { ActiveTimeTracker } from "@/components/ActiveTimeTracker";
import { KalnehiChrome } from "@/components/KalnehiChrome";
import { ProtectedLayout } from "@/components/ProtectedLayout";
import { ContactSupportProvider } from "@/components/support/ContactSupportProvider";
import { SyncProvider } from "@/components/SyncProvider";
import { PwaTracker } from "@/components/PwaTracker";
import { ActivityTracker } from "@/components/ActivityTracker";

export default function KalnehiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedLayout>
      <SyncProvider>
        <ContactSupportProvider>
          <PwaTracker />
          <ActivityTracker />
          <ActiveTimeTracker />
          <KalnehiChrome>{children}</KalnehiChrome>
        </ContactSupportProvider>
      </SyncProvider>
    </ProtectedLayout>
  );
}
