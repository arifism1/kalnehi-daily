import { KalnehiChrome } from "@/components/KalnehiChrome";
import { ProtectedLayout } from "@/components/ProtectedLayout";
import { ContactSupportProvider } from "@/components/support/ContactSupportProvider";
import { SyncProvider } from "@/components/SyncProvider";

export default function KalnehiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedLayout>
      <SyncProvider>
        <ContactSupportProvider>
          <KalnehiChrome>{children}</KalnehiChrome>
        </ContactSupportProvider>
      </SyncProvider>
    </ProtectedLayout>
  );
}
