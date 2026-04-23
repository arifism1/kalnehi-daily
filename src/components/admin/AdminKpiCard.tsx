export function AdminKpiCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-kal-border bg-kal-card/50 px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-kal-muted">{label}</p>
      <p
        className="mt-0.5 text-xl font-semibold tabular-nums text-kal-text"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {typeof value === "number" ? value.toLocaleString("en-IN") : value}
      </p>
      {sub && <p className="mt-0.5 text-[10px] text-kal-muted">{sub}</p>}
    </div>
  );
}
