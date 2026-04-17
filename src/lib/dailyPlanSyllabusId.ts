/**
 * Normalize syllabus_master UUID for Postgres `daily_tasks.syllabus_master_id`.
 * Accepts standard hyphenated UUIDs or 32-char hex (no hyphens).
 */
export function normalizeSyllabusMasterIdForDb(raw: string): string | null {
  const s = raw.trim().toLowerCase();
  if (!s) return null;
  const hyphenated =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  if (hyphenated.test(s)) return s;
  const plain = /^[0-9a-f]{32}$/;
  if (plain.test(s)) {
    return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
  }
  return null;
}
