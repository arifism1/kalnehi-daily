import { getOrgContext } from "@/lib/auth/withOrganization";
import { getOrgBatches } from "@/actions/b2b/getOrgAnalyticsAction";

export default async function B2BBatchesPage() {
  const ctx = await getOrgContext();
  if (!ctx) return null;

  const batches = await getOrgBatches(ctx.orgId);

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-2xl text-[var(--kal-text)] mb-1">
            Batches
          </h1>
          <p className="text-sm text-[var(--kal-muted)]">
            Manage your institute&apos;s class batches.
          </p>
        </div>
      </div>

      {batches.length === 0 ? (
        <div className="bg-[var(--kal-card)] border border-[var(--kal-border)] rounded-xl p-10 text-center shadow-[var(--kal-shadow-card)]">
          <p className="text-[var(--kal-muted)] text-sm">
            No batches yet. Create your first batch to assign students.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {batches.map((batch) => (
            <div
              key={batch.id}
              className="bg-[var(--kal-card)] border border-[var(--kal-border)] rounded-xl p-5 shadow-[var(--kal-shadow-card)] flex items-center justify-between"
            >
              <div>
                <p className="font-medium text-[var(--kal-text)] text-sm">
                  {batch.name}
                </p>
                <p className="text-xs text-[var(--kal-muted)] mt-0.5">
                  {batch.exam_type}
                </p>
              </div>
              <span className="text-xs bg-[var(--kal-accent-soft)] text-[var(--kal-accent)] px-2.5 py-1 rounded-full font-medium">
                {batch.exam_type}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
