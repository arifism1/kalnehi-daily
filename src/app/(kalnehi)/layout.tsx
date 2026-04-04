import { KalnehiChrome } from "@/components/KalnehiChrome";
import { ProtectedLayout } from "@/components/ProtectedLayout";

export default function KalnehiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedLayout>
      <KalnehiChrome>{children}</KalnehiChrome>
    </ProtectedLayout>
  );
}
