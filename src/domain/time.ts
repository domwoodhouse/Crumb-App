export const MINUTE_MS = 60 * 1000
export const HOUR_MS = 60 * MINUTE_MS
export const DAY_MS = 24 * HOUR_MS

// Formats a duration magnitude (in ms) as a short human label: "12m", "3h", "2d".
export function formatElapsed(ms: number): string {
  const magnitude = Math.abs(ms)
  if (magnitude < HOUR_MS) {
    const minutes = Math.max(1, Math.round(magnitude / MINUTE_MS))
    return `${minutes}m`
  }
  const hours = magnitude / HOUR_MS
  if (hours < 48) {
    return `${Math.round(hours)}h`
  }
  return `${Math.round(hours / 24)}d`
}
