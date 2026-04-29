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

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      // Strip the "data:image/png;base64," prefix — Filesystem.writeFile wants raw base64.
      resolve(dataUrl.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Native share path: writes PNG to the app's Cache dir via @capacitor/filesystem,
 * then opens the system share sheet via @capacitor/share.
 * The temp file is deleted after the share dialog closes (success or cancel).
 */
async function shareNative(blob: Blob, filename: string): Promise<void> {
  const { Filesystem, Directory } = await import("@capacitor/filesystem");
  const { Share } = await import("@capacitor/share");

  const base64Data = await blobToBase64(blob);

  const { uri } = await Filesystem.writeFile({
    path: filename,
    data: base64Data,
    directory: Directory.Cache,
  });

  try {
    await Share.share({
      title: "My Kalnehi recap",
      text: "Check out my daily recap on Kalnehi!",
      files: [uri],
      dialogTitle: "Share your recap",
    });
  } catch (err) {
    // AbortError means the user dismissed the share sheet — not an error.
    if (err instanceof Error && err.message?.toLowerCase().includes("cancel")) return;
    throw err;
  } finally {
    // Best-effort cleanup of the temp file.
    try {
      await Filesystem.deleteFile({ path: filename, directory: Directory.Cache });
    } catch {
      // ignore — OS will clean cache eventually
    }
  }
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
  // Native path: use Capacitor Filesystem + Share (bypasses broken WebView download).
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (Capacitor.isNativePlatform()) {
      await shareNative(blob, filename);
      return;
    }
  } catch {
    // Capacitor unavailable — fall through to web path.
  }

  // Web path: prefer Web Share API Level 2 (file sharing), fall back to <a download>.
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
      // Any other error (e.g. gesture context lost on iOS) → fall through to download.
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
