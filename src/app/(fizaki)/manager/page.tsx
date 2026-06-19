import { ManagerDashboardClient } from "@/components/fizaki/ManagerDashboardClient";
import { SurfacePlaceholder } from "@/components/fizaki/SurfacePlaceholder";
import { resolveFizakiRole } from "@/lib/fizaki/serverRole";

export default async function FizakiManagerPage() {
  const role = await resolveFizakiRole();
  if (role === "rep") {
    return (
      <SurfacePlaceholder
        title="Team"
        subtitle="This view is for managers and admins."
      />
    );
  }
  return <ManagerDashboardClient />;
}
