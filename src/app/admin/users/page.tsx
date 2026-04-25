import { AdminUsersClient } from "@/components/admin/users/AdminUsersClient";
import { listUsersForAdmin, searchUsersForAdmin } from "@/lib/admin/queries/userLookupQueries";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; view?: string; page?: string }>;
}) {
  const { q = "", view = "", page = "1" } = await searchParams;
  const isListView = view === "list";
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const initial = !isListView && q.trim().length >= 2 ? await searchUsersForAdmin(q) : [];
  const listData = isListView ? await listUsersForAdmin(pageNum) : { rows: [], total: 0 };
  return (
    <AdminUsersClient
      initial={initial}
      initialQ={q.trim()}
      listData={listData}
      isListView={isListView}
      listPage={pageNum}
    />
  );
}
