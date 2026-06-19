import { useEffect, useState } from 'react'

const REFRESH_INTERVAL_MS = 60_000

// Ticks every minute so status lines ("Fed 3h ago...") stay current without a page reload.
export function useNow(): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), REFRESH_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [])

  return now
}
