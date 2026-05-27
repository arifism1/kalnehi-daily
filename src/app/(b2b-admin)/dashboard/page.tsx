import { getOrgContext } from "@/lib/auth/withOrganization";
import { getOrgAnalytics } from "@/actions/b2b/getOrgAnalyticsAction";

export default async function B2BDashboardPage() {
  const ctx = await getOrgContext();
  if (!ctx) return null;

  const analytics = await getOrgAnalytics(ctx.orgId);

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="font-serif text-2xl text-[var(--kal-text)] mb-1">
        Dashboard
      </h1>
      <p className="text-sm text-[var(--kal-muted)] mb-8">
        Overview of your institute&apos;s activity on Kalnehi.
      </p>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-10">
        {[
          { label: "Total Students", value: analytics.totalStudents },
          { label: "Active (7d)", value: analytics.activeStudents7d },
          { label: "Avg. Daily Tasks", value: analytics.avgDailyTasks },
          { label: "Batches", value: analytics.totalBatches },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="bg-[var(--kal-card)] border border-[var(--kal-border)] rounded-xl p-5 shadow-[var(--kal-shadow-card)]"
          >
            <p className="text-xs text-[var(--kal-muted)] mb-1">{label}</p>
            <p className="text-2xl font-semibold text-[var(--kal-text)]">
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Recent activity placeholder */}
      <div className="bg-[var(--kal-card)] border border-[var(--kal-border)] rounded-xl p-6 shadow-[var(--kal-shadow-card)]">
        <h2 className="font-medium text-[var(--kal-text)] mb-4 text-sm">
          Recent Assignments
        </h2>
        {analytics.recentAssignments.length === 0 ? (
          <p className="text-sm text-[var(--kal-muted)]">
            No assignments pushed yet. Head to{" "}
            <a href="/assignments" className="text-[var(--kal-accent)] underline">
              Assignments
            </a>{" "}
            to get started.
          </p>
        ) : (
          <ul className="space-y-2">
            {analytics.recentAssignments.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-[var(--kal-text)]">{a.task_type}</span>
                <span className="text-[var(--kal-muted)] text-xs">
                  {new Date(a.created_at).toLocaleDateString("en-IN")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
