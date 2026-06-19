import { SurfacePlaceholder } from "@/components/fizaki/SurfacePlaceholder";

export default function FizakiPipelinePage() {
  return (
    <SurfacePlaceholder
      title="Pipeline"
      subtitle="Your deals and follow-ups — manual entry and voice now, CRM sync later."
      points={[
        "Add deals by hand or by voice",
        "Import an exported deal list (CSV)",
        "Slipped follow-ups roll into your backlog",
      ]}
    />
  );
}
