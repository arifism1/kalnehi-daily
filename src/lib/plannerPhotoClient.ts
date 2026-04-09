const JPEG_PREFIX = "data:image/jpeg;base64,";
const MAX_DATA_URL_LEN = 3_400_000;

function renderJpeg(bitmap: ImageBitmap, maxSide: number, quality: number): string {
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not read image.");
  ctx.drawImage(bitmap, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}

export async function compressImageForUpload(file: File): Promise<{
  base64: string;
  mimeType: "image/jpeg";
}> {
  if (typeof createImageBitmap !== "function") {
    throw new Error("Photo scan needs a browser that supports images.");
  }
  const bitmap = await createImageBitmap(file);
  try {
    let maxSide = 1680;
    let quality = 0.9;
    let dataUrl = "";
    for (let i = 0; i < 24; i++) {
      dataUrl = renderJpeg(bitmap, maxSide, quality);
      if (dataUrl.length <= MAX_DATA_URL_LEN) break;
      if (quality > 0.52) quality -= 0.06;
      else {
        quality = 0.88;
        maxSide = Math.max(480, Math.floor(maxSide * 0.82));
      }
    }
    if (dataUrl.length > MAX_DATA_URL_LEN + 120_000) {
      throw new Error("Photo is still too large. Try a tighter crop.");
    }
    if (!dataUrl.startsWith(JPEG_PREFIX)) {
      throw new Error("Could not encode image.");
    }
    return { base64: dataUrl.slice(JPEG_PREFIX.length), mimeType: "image/jpeg" };
  } finally {
    bitmap.close();
  }
}
