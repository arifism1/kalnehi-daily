import { getOrgContext } from "@/lib/auth/withOrganization";
import { getBatchStudents } from "@/actions/b2b/getBatchStudentsAction";

export default async function B2BStudentsPage() {
  const ctx = await getOrgContext();
  if (!ctx) return null;

  const students = await getBatchStudents({ orgId: ctx.orgId });

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="font-serif text-2xl text-[var(--kal-text)] mb-1">
        Students
      </h1>
      <p className="text-sm text-[var(--kal-muted)] mb-8">
        {students.length} student{students.length !== 1 ? "s" : ""} enrolled in
        your institute.
      </p>

      {students.length === 0 ? (
        <div className="bg-[var(--kal-card)] border border-[var(--kal-border)] rounded-xl p-10 text-center shadow-[var(--kal-shadow-card)]">
          <p className="text-[var(--kal-muted)] text-sm">
            No students linked yet. Use the link below to add students to your
            institute.
          </p>
        </div>
      ) : (
        <div className="bg-[var(--kal-card)] border border-[var(--kal-border)] rounded-xl shadow-[var(--kal-shadow-card)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--kal-border)] text-left">
                <th className="px-5 py-3 font-medium text-[var(--kal-muted)] text-xs uppercase tracking-wide">
                  Student
                </th>
                <th className="px-5 py-3 font-medium text-[var(--kal-muted)] text-xs uppercase tracking-wide">
                  Batch
                </th>
                <th className="px-5 py-3 font-medium text-[var(--kal-muted)] text-xs uppercase tracking-wide">
                  Joined
                </th>
              </tr>
            </thead>
            <tbody>
              {students.map((s, i) => (
                <tr
                  key={s.user_id}
                  className={
                    i < students.length - 1
                      ? "border-b border-[var(--kal-border)]"
                      : ""
                  }
                >
                  <td className="px-5 py-3 text-[var(--kal-text)] font-medium">
                    {s.full_name ?? "—"}
                    {s.email && (
                      <span className="block text-xs text-[var(--kal-muted)] font-normal">
                        {s.email}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-[var(--kal-text-secondary)]">
                    {s.batch_name ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-[var(--kal-muted)] text-xs">
                    {new Date(s.joined_at).toLocaleDateString("en-IN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
