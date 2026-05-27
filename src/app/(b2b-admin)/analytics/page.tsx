import { getOrgContext } from "@/lib/auth/withOrganization";
import { getOrgAnalytics, getOrgBatches } from "@/actions/b2b/getOrgAnalyticsAction";

export default async function B2BAnalyticsPage() {
  const ctx = await getOrgContext();
  if (!ctx) return null;

  const [analytics, batches] = await Promise.all([
    getOrgAnalytics(ctx.orgId),
    getOrgBatches(ctx.orgId),
  ]);

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="font-serif text-2xl text-[var(--kal-text)] mb-1">
        Analytics
      </h1>
      <p className="text-sm text-[var(--kal-muted)] mb-8">
        Engagement and progress across your institute.
      </p>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 mb-10">
        {[
          {
            label: "Total Students",
            value: analytics.totalStudents,
            sub: "enrolled",
          },
          {
            label: "Active (7 days)",
            value: analytics.activeStudents7d,
            sub: "students",
          },
          {
            label: "Avg. Daily Tasks",
            value: analytics.avgDailyTasks,
            sub: "per student",
          },
        ].map(({ label, value, sub }) => (
          <div
            key={label}
            className="bg-[var(--kal-card)] border border-[var(--kal-border)] rounded-xl p-5 shadow-[var(--kal-shadow-card)]"
          >
            <p className="text-xs text-[var(--kal-muted)] mb-1">{label}</p>
            <p className="text-3xl font-semibold text-[var(--kal-text)]">
              {value}
            </p>
            <p className="text-xs text-[var(--kal-muted)] mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Per-batch breakdown */}
      <div className="bg-[var(--kal-card)] border border-[var(--kal-border)] rounded-xl shadow-[var(--kal-shadow-card)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--kal-border)]">
          <h2 className="font-medium text-[var(--kal-text)] text-sm">
            Batch Breakdown
          </h2>
        </div>
        {batches.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-[var(--kal-muted)]">
              No batches created yet.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--kal-border)] text-left">
                <th className="px-5 py-3 font-medium text-[var(--kal-muted)] text-xs uppercase tracking-wide">
                  Batch
                </th>
                <th className="px-5 py-3 font-medium text-[var(--kal-muted)] text-xs uppercase tracking-wide">
                  Exam
                </th>
                <th className="px-5 py-3 font-medium text-[var(--kal-muted)] text-xs uppercase tracking-wide">
                  Created
                </th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b, i) => (
                <tr
                  key={b.id}
                  className={
                    i < batches.length - 1
                      ? "border-b border-[var(--kal-border)]"
                      : ""
                  }
                >
                  <td className="px-5 py-3 text-[var(--kal-text)] font-medium">
                    {b.name}
                  </td>
                  <td className="px-5 py-3 text-[var(--kal-text-secondary)]">
                    {b.exam_type}
                  </td>
                  <td className="px-5 py-3 text-[var(--kal-muted)] text-xs">
                    {new Date(b.created_at).toLocaleDateString("en-IN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
