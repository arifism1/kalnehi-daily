/**
 * Meta Pixel (Facebook Pixel) — `fbq` on `window` after the base snippet loads.
 * @see https://developers.facebook.com/docs/meta-pixel/reference
 */
export {};

declare global {
  interface Window {
    fbq?: MetaPixelFbq;
    _fbq?: unknown;
  }
}

/** Callable command queue installed by the Meta base code. */
interface MetaPixelFbq {
  (command: "init", pixelId: string, options?: Record<string, unknown>): void;
  (command: "track", eventName: string, parameters?: Record<string, unknown>): void;
  (command: "trackCustom", eventName: string, parameters?: Record<string, unknown>): void;
  (command: string, ...args: unknown[]): void;
}
