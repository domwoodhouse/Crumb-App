import { formatElapsed } from '../../domain/time'

export function formatRelativeTime(targetMs: number, now: number): string {
  const diff = targetMs - now
  return diff >= 0 ? `in ${formatElapsed(diff)}` : `${formatElapsed(diff)} ago`
}

export function formatClockTime(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatRatio(ratio: { starter: number; flour: number; water: number }): string {
  return `${ratio.starter}:${ratio.flour}:${ratio.water}`
}
