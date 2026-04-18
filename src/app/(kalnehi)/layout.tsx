import { KalnehiChrome } from "@/components/KalnehiChrome";
import { ProtectedLayout } from "@/components/ProtectedLayout";
import { SyncProvider } from "@/components/SyncProvider";

export default function KalnehiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedLayout>
      <SyncProvider>
        <KalnehiChrome>{children}</KalnehiChrome>
      </SyncProvider>
    </ProtectedLayout>
  );
}
