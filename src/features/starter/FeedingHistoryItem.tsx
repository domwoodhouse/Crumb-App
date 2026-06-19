import type { Feeding, RiseObservation } from '../../db/types'
import { calculateHydrationPercent } from '../../domain/starter'
import { formatElapsed } from '../../domain/time'
import { formatClockTime, formatRatio } from './format'

const RISE_OPTIONS: RiseObservation[] = ['barely', 'doubled', 'tripled', 'fell']

interface FeedingHistoryItemProps {
  feeding: Feeding
  isLatest: boolean
  onMarkPeaked: () => void
  onSetRiseObservation: (value: RiseObservation) => void
}

export function FeedingHistoryItem({ feeding, isLatest, onMarkPeaked, onSetRiseObservation }: FeedingHistoryItemProps) {
  const hydration = calculateHydrationPercent(feeding.ratio)

  return (
    <li className="rounded-lg border border-stone-200 bg-white p-3">
      <div className="flex items-baseline justify-between">
        <span className="font-medium text-stone-800">{formatRatio(feeding.ratio)}</span>
        <span className="text-xs text-stone-400">{formatClockTime(feeding.fedAt)}</span>
      </div>
      <p className="mt-1 text-sm text-stone-500">
        {feeding.flourType} flour · {hydration.toFixed(0)}% hydration · {feeding.ambientTempC}°C
      </p>

      {feeding.peakedAt !== null ? (
        <p className="mt-1 text-sm text-stone-600">
          Peaked after {formatElapsed(feeding.peakedAt - feeding.fedAt)}
          {feeding.riseObservation ? ` — ${feeding.riseObservation}` : ''}
        </p>
      ) : isLatest ? (
        <div className="mt-2">
          <button
            type="button"
            onClick={onMarkPeaked}
            className="rounded-md bg-amber-800 px-3 py-1 text-sm font-medium text-white"
          >
            Mark peaked
          </button>
        </div>
      ) : (
        <p className="mt-1 text-sm text-stone-400">Not marked peaked</p>
      )}

      {isLatest && feeding.peakedAt !== null && (
        <div className="mt-2">
          <span className="text-xs text-stone-500">How did it rise?</span>
          <div className="mt-1 flex gap-1.5">
            {RISE_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => onSetRiseObservation(option)}
                className={`rounded-md px-2 py-1 text-xs capitalize ${
                  feeding.riseObservation === option ? 'bg-amber-800 text-white' : 'bg-stone-100 text-stone-700'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      )}

      {feeding.notes && <p className="mt-2 text-sm italic text-stone-500">{feeding.notes}</p>}
    </li>
  )
}
