import { toPng } from "html-to-image";
import { Capacitor } from "@capacitor/core";

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

/** Converts a Blob to a raw base64 string (no data: prefix) for Capacitor Filesystem. */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
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
  // ── Native Android: write PNG to cache dir then open system share sheet ──
  // navigator.canShare({ files }) returns false in Android WebView (Web Share
  // Level 2 with files is Chrome-browser-only). Capacitor Filesystem + Share
  // give us the real native share sheet so WhatsApp, Telegram, etc. appear.
  if (Capacitor.isNativePlatform()) {
    try {
      const base64 = await blobToBase64(blob);
      const { Filesystem, Directory } = await import("@capacitor/filesystem");
      const { Share } = await import("@capacitor/share");
      await Filesystem.writeFile({
        path: filename,
        data: base64,
        directory: Directory.Cache,
      });
      const { uri } = await Filesystem.getUri({
        path: filename,
        directory: Directory.Cache,
      });
      await Share.share({
        title: "My Kalnehi recap",
        files: [uri],
        dialogTitle: "Share your recap",
      });
    } catch (err) {
      // User cancelled or share sheet unavailable — silently ignore.
      if (err instanceof Error && err.message.toLowerCase().includes("cancel")) return;
      console.warn("[shareCardExport] native share failed:", err);
    }
    return;
  }

  // ── Web: Web Share API Level 2 (file sharing), falling back to <a download> ──
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
      // User cancelled the share sheet — do nothing.
      if (err instanceof DOMException && err.name === "AbortError") return;
      // Any other error → fall through to download.
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
