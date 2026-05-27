import { getOrgContext } from "@/lib/auth/withOrganization";
import { getOrgAssignments } from "@/actions/b2b/getOrgAnalyticsAction";

export default async function B2BAssignmentsPage() {
  const ctx = await getOrgContext();
  if (!ctx) return null;

  const assignments = await getOrgAssignments(ctx.orgId);

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-2xl text-[var(--kal-text)] mb-1">
            Assignments
          </h1>
          <p className="text-sm text-[var(--kal-muted)]">
            Push study tasks to your batches.
          </p>
        </div>
      </div>

      {assignments.length === 0 ? (
        <div className="bg-[var(--kal-card)] border border-[var(--kal-border)] rounded-xl p-10 text-center shadow-[var(--kal-shadow-card)]">
          <p className="text-[var(--kal-muted)] text-sm">
            No assignments pushed yet. Create an assignment to send tasks to
            your students.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map((a) => (
            <div
              key={a.id}
              className="bg-[var(--kal-card)] border border-[var(--kal-border)] rounded-xl p-5 shadow-[var(--kal-shadow-card)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="inline-block text-xs bg-[var(--kal-accent-soft)] text-[var(--kal-accent)] px-2 py-0.5 rounded-full font-medium mb-2">
                    {a.task_type}
                  </span>
                  <p className="text-sm text-[var(--kal-text-secondary)]">
                    Batch:{" "}
                    <span className="text-[var(--kal-text)]">
                      {a.batch_name ?? "All batches"}
                    </span>
                  </p>
                </div>
                <p className="text-xs text-[var(--kal-muted)] shrink-0">
                  {a.scheduled_for
                    ? new Date(a.scheduled_for).toLocaleDateString("en-IN")
                    : new Date(a.created_at).toLocaleDateString("en-IN")}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
