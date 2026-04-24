/**
 * Short success tone (no external asset). Safe no-op if AudioContext is blocked.
 */
export function playCelebrationBeep() {
  if (typeof window === "undefined" || !window.AudioContext) return;
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.frequency.setValueAtTime(520, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
    g.gain.setValueAtTime(0.12, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
    o.start();
    o.stop(ctx.currentTime + 0.28);
    o.onended = () => ctx.close();
  } catch {
    /* ignore */
  }
}
