"use client";

import {
  ResponsiveContainer,
  type ResponsiveContainerProps,
} from "recharts";

type AdminChartProps = {
  children: ResponsiveContainerProps["children"];
  height?: number;
  className?: string;
};

/**
 * Wraps Recharts ResponsiveContainer with a fixed height so charts layout predictably in admin pages.
 */
export function AdminChart({ children, height = 280, className }: AdminChartProps) {
  return (
    <div className={className ?? "w-full"} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}
