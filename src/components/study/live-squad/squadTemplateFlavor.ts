import {
  isJeeMainsExam,
  isNeetUgExam,
} from "@/lib/examProfile";
import { isUpscCseMainsExam } from "@/lib/upscMainsOptionalSubjects";

function norm(exam: string | null | undefined): string {
  return (exam ?? "").trim().toLowerCase().replace(/[\s_-]+/g, " ");
}

export type SquadTemplateFlavor =
  | "upsc"
  | "jee"
  | "medical"
  | "gate"
  | "banking"
  | "law"
  | "mba"
  | "general";

export function getSquadTemplateFlavor(
  exam: string | null | undefined,
): SquadTemplateFlavor {
  if (!exam?.trim()) return "general";
  const n = norm(exam);
  if (n === "upsc cse prelims" || isUpscCseMainsExam(exam)) return "upsc";
  if (isJeeMainsExam(exam) || n === "jee advanced") return "jee";
  if (isNeetUgExam(exam) || n === "neet pg" || n === "ini cet") {
    return "medical";
  }
  if (n === "gate") return "gate";
  if (n === "ssc cgl" || n === "ssc chsl" || n === "sbi po" || n === "ibps po") {
    return "banking";
  }
  if (n === "clat" || n === "clat ug") return "law";
  if (
    n === "cat" ||
    n === "gmat" ||
    n === "ipmat indore" ||
    n === "ipmat rohtak" ||
    n === "jipmat"
  ) {
    return "mba";
  }
  return "general";
}
