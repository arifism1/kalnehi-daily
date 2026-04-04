/**
 * Normalize syllabus_master UUID strings for consistent Map/object lookups.
 * PostgREST may return UUIDs in a different case than `syllabus_master.id` from the client.
 */
export function normalizeSyllabusMasterId(id: string): string {
  return String(id).trim().toLowerCase();
}
