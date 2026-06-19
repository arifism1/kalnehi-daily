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
  return (
    <SurfacePlaceholder
      title="Team"
      subtitle="Prove enablement drives revenue."
      points={[
        "Per-rep ramp progress and consistency",
        "Competency / knowledge gaps across the team",
        "Quota attainment and ramp time (days-to-first-deal)",
      ]}
    />
  );
}
