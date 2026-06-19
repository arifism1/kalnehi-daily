import { SurfacePlaceholder } from "@/components/fizaki/SurfacePlaceholder";
import { resolveFizakiRole } from "@/lib/fizaki/serverRole";

export default async function FizakiImportPage() {
  const role = await resolveFizakiRole();
  if (role !== "admin") {
    return (
      <SurfacePlaceholder
        title="Import Playbook"
        subtitle="This view is for admins."
      />
    );
  }
  return (
    <SurfacePlaceholder
      title="Import Playbook"
      subtitle="Upload your existing sales playbook — we structure it into modules and skills."
      points={[
        "Paste or upload your playbook document",
        "Auto-structured into a knowledge tree",
        "Reps get spaced reinforcement from day one",
      ]}
    />
  );
}
