"use client";

import type { AppConfig } from "@/lib/admin/killSwitch";
import { AdminDailyCapSection, type DailyCountRow } from "./AdminDailyCapSection";

type Props = {
  config: AppConfig;
  dailyCapHistory?: DailyCountRow[];
};

export function AdminSystemClient({ config, dailyCapHistory = [] }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-kal-text">System</h1>
        <p className="mt-0.5 text-sm text-kal-muted">
          Daily trial cap settings and history.
        </p>
      </div>

      <AdminDailyCapSection
        initialConfig={config}
        initialHistory={dailyCapHistory}
      />
    </div>
  );
}
