import { AdminExamSegmentsClient } from "@/components/admin/exam-segments/AdminExamSegmentsClient";
import { getExamSegmentsSnapshot } from "@/lib/admin/queries/examSegmentsQueries";

export const dynamic = "force-dynamic";

export default async function AdminExamSegmentsPage() {
  const data = await getExamSegmentsSnapshot();
  if (!data) {
    return <div className="text-sm text-red-500">Service role unavailable.</div>;
  }
  return <AdminExamSegmentsClient data={data} />;
}
