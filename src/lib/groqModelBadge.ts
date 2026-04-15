export type GroqModelBadgeKind = "70b_green" | "8b_orange" | "neutral";

/**
 * Maps Groq model id to short UI copy + color bucket for dev/debug badges.
 */
export function groqModelBadgeFromId(modelId: string): {
  label: string;
  kind: GroqModelBadgeKind;
} {
  const id = modelId.trim().toLowerCase();
  if (!id) return { label: "Using unknown model", kind: "neutral" };

  if (id === "llama-3.1-8b-instant" || id.includes("8b-instant")) {
    return { label: "Using Llama 3.1 8B", kind: "8b_orange" };
  }
  if (id.includes("3.3-70b") || id === "llama-3.3-70b-versatile") {
    return { label: "Using Llama 3.3 70B", kind: "70b_green" };
  }
  if (id.includes("70b")) {
    return { label: "Using Llama 3.1 70B", kind: "70b_green" };
  }

  return {
    label: `Using ${modelId}`,
    kind: "neutral",
  };
}
