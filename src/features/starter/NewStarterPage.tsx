import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { starterRepository } from '../../db/repositories/starterRepository'
import type { StarterStorage } from '../../db/types'
import { COMMON_FLOUR_TYPES } from './constants'

export function NewStarterPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [flourType, setFlourType] = useState(COMMON_FLOUR_TYPES[0])
  const [hydrationPercent, setHydrationPercent] = useState(100)
  const [storage, setStorage] = useState<StarterStorage>('counter')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!name.trim()) return

    setSubmitting(true)
    const starter = await starterRepository.create({
      name: name.trim(),
      flourType,
      hydrationPercent,
      storage,
    })
    navigate(`/starter/${starter.id}`)
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold text-stone-800">New starter</h1>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-stone-700">Name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Doughy"
            required
            className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-stone-700">Flour type</span>
          <input
            type="text"
            value={flourType}
            onChange={(e) => setFlourType(e.target.value)}
            list="flour-types"
            className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2"
          />
          <datalist id="flour-types">
            {COMMON_FLOUR_TYPES.map((flour) => (
              <option key={flour} value={flour} />
            ))}
          </datalist>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-stone-700">Hydration %</span>
          <input
            type="number"
            min={0}
            value={hydrationPercent}
            onChange={(e) => setHydrationPercent(Number(e.target.value))}
            className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2"
          />
        </label>

        <fieldset className="block">
          <span className="text-sm font-medium text-stone-700">Storage</span>
          <div className="mt-1 flex gap-2">
            {(['counter', 'fridge'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setStorage(option)}
                className={`rounded-md px-3 py-1.5 text-sm capitalize ${
                  storage === option ? 'bg-amber-800 text-white' : 'bg-stone-100 text-stone-700'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-amber-800 px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          Create starter
        </button>
      </form>
    </div>
  )
}
