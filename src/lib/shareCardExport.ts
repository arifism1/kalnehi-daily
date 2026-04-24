import { toPng } from "html-to-image";

export type ShareCardExportOptions = {
  /** Device pixel ratio for sharper Instagram exports. */
  pixelRatio?: number;
  /** Pass `undefined` to preserve transparent / node backgrounds. */
  backgroundColor?: string;
};

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "image/png";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

/**
 * Renders a DOM node to PNG; used by recap / weekly share cards.
 */
export async function exportShareablePng(
  node: HTMLElement,
  options?: ShareCardExportOptions,
): Promise<Blob> {
  const pixelRatio = options?.pixelRatio ?? 2;
  const dataUrl = await toPng(node, {
    pixelRatio,
    cacheBust: true,
    ...(options?.backgroundColor !== undefined
      ? { backgroundColor: options.backgroundColor }
      : {}),
  });
  return dataUrlToBlob(dataUrl);
}

export async function shareOrDownloadPng(blob: Blob, filename: string): Promise<void> {
  const file = new File([blob], filename, { type: "image/png" });
  if (typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: "My Kalnehi recap",
        text: "Check out my daily recap on Kalnehi!",
      });
      return;
    } catch (err) {
      // User cancelled the share sheet — do nothing (no fallback download)
      if (err instanceof DOMException && err.name === "AbortError") return;
      // Any other error (e.g. gesture context lost on iOS) → fall through to download
    }
  }
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}
