import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { starterRepository } from '../../db/repositories/starterRepository'
import { StarterListItem } from './StarterListItem'

export function StarterListPage() {
  const starters = useLiveQuery(() => starterRepository.getAll())

  return (
    <div className="p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-stone-800">Starters</h1>
        <Link
          to="/starter/new"
          className="rounded-md bg-amber-800 px-3 py-1.5 text-sm font-medium text-white"
        >
          + New starter
        </Link>
      </div>

      <div className="mt-4 space-y-3">
        {starters === undefined && <p className="text-sm text-stone-500">Loading…</p>}
        {starters?.length === 0 && (
          <p className="text-sm text-stone-500">
            No starters yet. Add one to start tracking feedings and peak times.
          </p>
        )}
        {starters?.map((starter) => (
          <StarterListItem key={starter.id} starter={starter} />
        ))}
      </div>
    </div>
  )
}
