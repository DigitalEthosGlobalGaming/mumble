/* Small helpers shared by the core and by parts. */

export const INK = "#1a1a1a", BAG = "#b9a07a", RED = "#c8202b";

export const hash = (s: string) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
export function mulberry(a: number) {
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
/* mix a colour towards black (f < 0) or white (f > 0) */
export const shade = (hex: string, f: number) => {
  const n = parseInt(hex.slice(1), 16);
  return "#" + [n >> 16, n >> 8 & 255, n & 255].map(c => Math.round(f < 0 ? c * (1 + f) : c + (255 - c) * f).toString(16).padStart(2, "0")).join("");
};
export const light = (hex: string) => { const n = parseInt(hex.slice(1), 16); return (n >> 16) * 0.3 + (n >> 8 & 255) * 0.59 + (n & 255) * 0.11 > 150; };

export const randomSeed = () => Math.random().toString(36).slice(2, 10);
