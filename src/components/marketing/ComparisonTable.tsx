import { Check, X, Minus } from "lucide-react";

export type ComparisonValue = "yes" | "no" | "partial" | string;

export interface ComparisonRow {
  feature: string;
  kalnehi: ComparisonValue;
  competitor: ComparisonValue;
  note?: string;
}

interface ComparisonTableProps {
  competitorName: string;
  rows: ComparisonRow[];
}

function Cell({ value }: { value: ComparisonValue }) {
  if (value === "yes") {
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
        <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-label="Yes" />
      </span>
    );
  }
  if (value === "no") {
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-500/10 text-red-500">
        <X className="h-3.5 w-3.5" strokeWidth={2.5} aria-label="No" />
      </span>
    );
  }
  if (value === "partial") {
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
        <Minus className="h-3.5 w-3.5" strokeWidth={2.5} aria-label="Partial" />
      </span>
    );
  }
  return <span className="text-xs text-kal-text-secondary">{value}</span>;
}

export function ComparisonTable({ competitorName, rows }: ComparisonTableProps) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-kal-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-kal-border bg-kal-card">
            <th className="px-4 py-3 text-left font-semibold text-kal-text">Feature</th>
            <th className="px-4 py-3 text-center font-bold text-kal-accent">Kalnehi Daily</th>
            <th className="px-4 py-3 text-center font-semibold text-kal-text-secondary">
              {competitorName}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.feature}
              className={i % 2 === 0 ? "bg-kal-page" : "bg-kal-card/40"}
            >
              <td className="px-4 py-3 text-kal-text">
                <span className="font-medium">{row.feature}</span>
                {row.note && (
                  <span className="block text-xs text-kal-muted mt-0.5">{row.note}</span>
                )}
              </td>
              <td className="px-4 py-3 text-center">
                <Cell value={row.kalnehi} />
              </td>
              <td className="px-4 py-3 text-center">
                <Cell value={row.competitor} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
