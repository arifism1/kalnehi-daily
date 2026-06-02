import { SyllabusPageSkeleton } from "@/components/syllabus/SyllabusPageSkeleton";

export default function SyllabusRouteLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-4 sm:px-6 sm:py-5">
      <SyllabusPageSkeleton />
    </div>
  );
}
