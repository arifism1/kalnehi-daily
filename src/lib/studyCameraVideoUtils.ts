/**
 * Browser helpers to favour the widest field of view (desk/notes in frame) for
 * the study camera: lens selection, zoom, and getUserMedia constraints.
 */

const TELE_EXCLUDE =
  /tele(photo)?|periscope|^\s*2x\s*$|^\s*3x\s*$|^\s*5x\s*$|portrait|macro|bokeh|tof|depth|luminosity|long\s*range/i;

const ULTRA_OR_ZERO_FIVE = /ultra[ -]?wide|0[.,]5x?|uwa|超广角|super[ -]wide|grand\s*angle|gran angular|weitwinkel/i;
const WIDE_WORD = /\bwide\b/i;

type Facing = "user" | "environment";

/**
 * Picks a videoinput device that is likely the ultrawide / 0.5x lens when the
 * OS exposes distinct devices (common on multi-camera phones).
 * Returns `null` to keep the current default stream.
 */
export function selectWideAngleDeviceId(
  devices: MediaDeviceInfo[],
  facing: Facing,
  currentDeviceId: string | undefined,
): string | null {
  const inputs = devices.filter(
    (d) => d.kind === "videoinput" && d.deviceId && d.label?.trim(),
  );
  if (inputs.length < 2) return null;

  const scoreFor = (label: string) => {
    if (TELE_EXCLUDE.test(label)) return -1;
    let s = 0;
    if (ULTRA_OR_ZERO_FIVE.test(label)) s += 100;
    else if (WIDE_WORD.test(label) && !TELE_EXCLUDE.test(label)) s += 45;
    if (facing === "environment") {
      if (/back|rear|外|arrière|trás|rück|后置|ultra|wide|environment/i.test(label)) s += 8;
      if (/front|selfie|facing|user|前|FaceTime(?!.*back)/i.test(label)) s -= 30;
    } else {
      if (/front|selfie|facing|user|前|FaceTime|facetime/i.test(label)) s += 6;
    }
    return s;
  };

  let best: { id: string; score: number } | null = null;
  for (const d of inputs) {
    const score = scoreFor(d.label!);
    if (score < 40) continue;
    if (!best || score > best.score) {
      best = { id: d.deviceId, score };
    }
  }
  if (!best) return null;
  if (best.id === currentDeviceId) return null;
  return best.id;
}

/**
 * Request minimum zoom (widest FOV) when the track reports zoom in capabilities
 * (many Android phones, some webcams).
 */
export function applyWidestZoomToTrack(videoTrack: MediaStreamTrack | undefined) {
  if (!videoTrack?.getCapabilities) return;
  const caps = videoTrack.getCapabilities() as { zoom?: { min?: number; max?: number } };
  const z = caps.zoom;
  if (z && typeof z.min === "number") {
    const target = z.min;
    const cur = (videoTrack.getSettings() as { zoom?: number }).zoom;
    if (cur !== undefined && Math.abs(cur - target) < 0.02) return;
    void videoTrack
      .applyConstraints({
        advanced: [{ zoom: target } as unknown as MediaTrackConstraintSet],
      })
      .catch(() => {
        /* not supported on many laptops */
      });
  }
}

/** getUserMedia constraints: ask for a large frame (more scene before any crop). */
export function getStudyCameraBaseVideoConstraints(
  facing: Facing,
  deviceId: string | null,
) {
  if (deviceId) {
    return {
      deviceId: { exact: deviceId },
      width: { ideal: 1920, min: 1280 },
      height: { ideal: 1080, min: 720 },
      frameRate: { ideal: 30, max: 30 },
    } as const;
  }
  return {
    facingMode: facing,
    width: { ideal: 1920, min: 1280, max: 4096 as number },
    height: { ideal: 1080, min: 720, max: 2160 as number },
    aspectRatio: { ideal: 16 / 9 },
    frameRate: { ideal: 30, max: 30 },
  } as const;
}
