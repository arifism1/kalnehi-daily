"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { getRecentReflections, type DailyReflectionRow } from "@/actions/dailyReflections";
import { useCalendarDate } from "@/hooks/useCalendarDate";

import { ReflectionHistoryList } from "./ReflectionHistoryList";

const PREVIOUS_LIMIT = 30;

export function PreviousDailyDebriefsSection() {
  const today = useCalendarDate();
  const [rows, setRows] = useState<DailyReflectionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const result = await getRecentReflections(PREVIOUS_LIMIT);
      if (cancelled) return;
      if (result.ok) {
        setRows(
          result.data
            .filter((r) => r.reflection_date !== today)
            .sort((a, b) => b.reflection_date.localeCompare(a.reflection_date)),
        );
      }
      setLoading(false);
    }
    setLoading(true);
    void load();
    return () => {
      cancelled = true;
    };
  }, [today]);

  useEffect(() => {
    function onUpdated() {
      void (async () => {
        const result = await getRecentReflections(PREVIOUS_LIMIT);
        if (result.ok) {
          setRows(
            result.data
              .filter((r) => r.reflection_date !== today)
              .sort((a, b) => b.reflection_date.localeCompare(a.reflection_date)),
          );
        }
      })();
    }
    window.addEventListener("kalnehi-daily-reflection-updated", onUpdated);
    return () => window.removeEventListener("kalnehi-daily-reflection-updated", onUpdated);
  }, [today]);

  if (loading) {
    return (
      <section className="space-y-3" aria-busy="true" aria-label="Loading previous debriefs">
        <h2 className="kal-section-heading text-sm">Previous daily debriefs</h2>
        <div className="flex min-h-[120px] items-center justify-center rounded-2xl border border-kal-border/50 bg-kal-card-muted/30">
          <Loader2 className="h-6 w-6 animate-spin text-kal-accent/60" />
        </div>
      </section>
    );
  }

  if (rows.length === 0) {
    return (
      <section className="space-y-3">
        <h2 className="kal-section-heading text-sm">Previous daily debriefs</h2>
        <p className="kal-glass-subtle rounded-xl p-4 text-sm text-kal-text-secondary">
          No earlier debriefs yet. Save today&apos;s reflection and they will show up here.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="kal-section-heading text-sm">Previous daily debriefs</h2>
      <ReflectionHistoryList rows={rows} />
    </section>
  );
}
