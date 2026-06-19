import { describe, expect, it } from 'vitest'
import { formatElapsed, HOUR_MS, MINUTE_MS } from './time'

describe('formatElapsed', () => {
  it('formats sub-minute durations as at least 1 minute', () => {
    expect(formatElapsed(30 * 1000)).toBe('1m')
  })

  it('formats minutes', () => {
    expect(formatElapsed(30 * MINUTE_MS)).toBe('30m')
  })

  it('formats hours', () => {
    expect(formatElapsed(3 * HOUR_MS)).toBe('3h')
  })

  it('formats hours just under the day cutoff', () => {
    expect(formatElapsed(47 * HOUR_MS)).toBe('47h')
  })

  it('formats days once past the cutoff', () => {
    expect(formatElapsed(50 * HOUR_MS)).toBe('2d')
  })

  it('ignores sign — formats the magnitude', () => {
    expect(formatElapsed(-3 * HOUR_MS)).toBe('3h')
  })
})
