import { SurfacePlaceholder } from "@/components/fizaki/SurfacePlaceholder";

export default function FizakiPlaybookPage() {
  return (
    <SurfacePlaceholder
      title="Playbook"
      subtitle="Your modules and skills, structured for retention — not crammed once."
      points={[
        "Modules → skills → micro-skills",
        "Spaced reinforcement so knowledge sticks",
        "Progress feeds your quota-readiness projection",
      ]}
    />
  );
}
