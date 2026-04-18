import { RoutePageSkeleton } from "@/components/loading/RoutePageSkeleton";

export default function KalnehiLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <RoutePageSkeleton />
    </div>
  );
}
