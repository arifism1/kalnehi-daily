import { AdminUsersClient } from "@/components/admin/users/AdminUsersClient";
import { searchUsersForAdmin } from "@/lib/admin/queries/userLookupQueries";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const initial = q.trim().length >= 2 ? await searchUsersForAdmin(q) : [];
  return <AdminUsersClient initial={initial} initialQ={q.trim()} />;
}
