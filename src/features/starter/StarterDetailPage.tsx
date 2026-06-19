import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useParams } from 'react-router-dom'
import { feedingRepository } from '../../db/repositories/feedingRepository'
import { starterRepository } from '../../db/repositories/starterRepository'
import type { RiseObservation } from '../../db/types'
import { estimatePeakWindow, recommendNextFeeding } from '../../domain/starter'
import { FeedingHistoryItem } from './FeedingHistoryItem'
import { formatClockTime, formatRatio, formatRelativeTime } from './format'
import { useNow } from './useNow'

export function StarterDetailPage() {
  const { starterId } = useParams<{ starterId: string }>()
  const now = useNow()

  const starter = useLiveQuery(() => starterRepository.getById(starterId!), [starterId])
  const feedings = useLiveQuery(() => feedingRepository.getByStarter(starterId!), [starterId])

  if (feedings === undefined || starter === undefined) {
    return <p className="p-4 text-sm text-stone-500">Loading…</p>
  }

  const latestFeeding = feedings[0]

  async function handleMarkPeaked() {
    await feedingRepository.markPeaked(latestFeeding.id)
  }

  async function handleSetRiseObservation(value: RiseObservation) {
    await feedingRepository.update(latestFeeding.id, { riseObservation: value })
  }

  const recommendation = recommendNextFeeding(starter, latestFeeding ?? null)
  const peakWindow =
    latestFeeding && latestFeeding.peakedAt === null
      ? estimatePeakWindow(latestFeeding, latestFeeding.ambientTempC)
      : null

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold text-stone-800">{starter.name}</h1>
      <p className="mt-1 text-sm text-stone-500">
        {starter.flourType} flour · {starter.hydrationPercent}% hydration · {starter.storage}
      </p>

      <Link
        to={`/starter/${starter.id}/feed`}
        className="mt-4 block w-full rounded-md bg-amber-800 px-4 py-2 text-center font-medium text-white"
      >
        Feed
      </Link>

      {peakWindow && (
        <p className="mt-3 text-sm text-stone-600">
          Estimated peak: {formatClockTime(peakWindow.earliest.getTime())} – {formatClockTime(peakWindow.latest.getTime())}{' '}
          ({peakWindow.label})
        </p>
      )}

      <div className="mt-4 rounded-lg border border-stone-200 bg-stone-50 p-3">
        <p className="text-sm font-medium text-stone-700">
          Next feeding recommended {formatRelativeTime(recommendation.recommendedAt.getTime(), now)} (
          {formatClockTime(recommendation.recommendedAt.getTime())}), ratio {formatRatio(recommendation.ratio)}
        </p>
        <p className="mt-1 text-xs text-stone-500">{recommendation.reason} Estimated — not a guarantee.</p>
      </div>

      <h2 className="mt-6 text-lg font-semibold text-stone-800">Feeding history</h2>
      {feedings.length === 0 ? (
        <p className="mt-2 text-sm text-stone-500">No feedings logged yet. Feed this starter to start a history.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {feedings.map((feeding) => (
            <FeedingHistoryItem
              key={feeding.id}
              feeding={feeding}
              isLatest={feeding.id === latestFeeding.id}
              onMarkPeaked={handleMarkPeaked}
              onSetRiseObservation={handleSetRiseObservation}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
