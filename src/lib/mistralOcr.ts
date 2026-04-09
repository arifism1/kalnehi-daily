import { Mistral } from "@mistralai/mistralai";

const MODEL = "mistral-ocr-latest";
const MAX_RETRIES = 2;

export type MistralOcrResult =
  | { ok: true; markdown: string }
  | { ok: false; error: string };

function isTransientError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  if (/429|503|502|500|timeout|ETIMEDOUT|ECONNRESET|rate limit/i.test(msg)) {
    return true;
  }
  const e = err as { status?: number };
  if (typeof e?.status === "number" && e.status >= 500) return true;
  if (e?.status === 429) return true;
  return false;
}

/**
 * Runs Mistral OCR on a base64-encoded image and returns the extracted
 * markdown text. Retries once on transient errors.
 */
export async function ocrHandwrittenPhoto(
  imageBase64: string,
  mimeType: string,
): Promise<MistralOcrResult> {
  const apiKey = process.env.MISTRAL_API_KEY?.trim();
  if (!apiKey) {
    return {
      ok: false,
      error:
        "Photo scan needs MISTRAL_API_KEY on the server. You can still paste text below.",
    };
  }

  const b64 = imageBase64.trim();
  if (!b64) {
    return { ok: false, error: "No image data." };
  }

  const dataUrl = `data:${mimeType};base64,${b64}`;
  const client = new Mistral({ apiKey });

  let lastErr: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await client.ocr.process({
        model: MODEL,
        document: {
          imageUrl: dataUrl,
          type: "image_url",
        },
      });

      const markdown = (result.pages ?? [])
        .map((p) => (p as { markdown?: string }).markdown ?? "")
        .filter(Boolean)
        .join("\n\n");

      if (!markdown.trim()) {
        return {
          ok: false,
          error:
            "Could not read any text from that photo. Try a clearer picture.",
        };
      }

      return { ok: true, markdown };
    } catch (e) {
      lastErr = e;
      if (!isTransientError(e) || attempt === MAX_RETRIES) break;
    }
  }

  console.error(
    "Mistral OCR error:",
    lastErr instanceof Error ? lastErr.message : String(lastErr),
  );
  return {
    ok: false,
    error: "Could not scan that photo right now. Try again in a moment.",
  };
}
