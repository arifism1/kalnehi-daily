import { examDisplayLabel } from "@/lib/examProfile";

/** Human label: "NEET aspirants", "JEE Main aspirants", etc. */
export function cohortAspirantLabel(cohortKey: string): string {
  const n = cohortKey.toLowerCase();
  if (n === "neet ug") return "NEET aspirants";
  if (n === "neet pg") return "NEET PG aspirants";
  const short = examDisplayLabel(cohortKey);
  return `${short} aspirants`;
}
