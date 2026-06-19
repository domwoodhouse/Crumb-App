import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { feedingRepository } from '../../db/repositories/feedingRepository'
import type { Starter } from '../../db/types'
import { describeStarterStatus } from '../../domain/starter'
import { useNow } from './useNow'

interface StarterListItemProps {
  starter: Starter
}

export function StarterListItem({ starter }: StarterListItemProps) {
  const now = useNow()
  // getByStarter (array) resolves to [] once there are genuinely no feedings, distinct from
  // the in-flight `undefined` — getLatest can't make that distinction since both cases
  // resolve to undefined, which would hide the status line for a never-fed starter forever.
  const feedings = useLiveQuery(() => feedingRepository.getByStarter(starter.id), [starter.id])
  const status = feedings === undefined ? null : describeStarterStatus(feedings[0] ?? null, now)

  return (
    <Link to={`/starter/${starter.id}`} className="block rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold text-stone-800">{starter.name}</h2>
        <span className="text-xs uppercase tracking-wide text-stone-400">{starter.storage}</span>
      </div>
      <p className="mt-1 text-sm text-stone-500">
        {starter.flourType} flour · {starter.hydrationPercent}% hydration
      </p>
      {status && (
        <p className={`mt-2 text-sm font-medium ${status.tone === 'attention' ? 'text-amber-700' : 'text-stone-600'}`}>
          {status.label}
        </p>
      )}
    </Link>
  )
}
