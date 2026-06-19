import { ImportPlaybookClient } from "@/components/fizaki/ImportPlaybookClient";
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
  return <ImportPlaybookClient />;
}
