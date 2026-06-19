import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { feedingRepository } from '../../db/repositories/feedingRepository'
import { starterRepository } from '../../db/repositories/starterRepository'
import { userProfileRepository } from '../../db/repositories/userProfileRepository'
import type { FeedingRatio } from '../../db/types'
import { calculateHydrationPercent } from '../../domain/starter'
import { COMMON_FLOUR_TYPES, RATIO_PRESETS } from './constants'

const DEFAULT_AMBIENT_TEMP_C = 21

export function FeedFormPage() {
  const { starterId } = useParams<{ starterId: string }>()
  const navigate = useNavigate()

  const starter = useLiveQuery(() => starterRepository.getById(starterId!), [starterId])
  const profile = useLiveQuery(() => userProfileRepository.get())

  const [presetIndex, setPresetIndex] = useState<number | 'custom'>(0)
  const [ratio, setRatio] = useState<FeedingRatio>(RATIO_PRESETS[0].ratio)
  const [flourType, setFlourType] = useState(COMMON_FLOUR_TYPES[0])
  const [flourInitialized, setFlourInitialized] = useState(false)
  const [ambientTempC, setAmbientTempC] = useState(DEFAULT_AMBIENT_TEMP_C)
  const [tempInitialized, setTempInitialized] = useState(false)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!flourInitialized && starter) {
      setFlourType(starter.flourType)
      setFlourInitialized(true)
    }
  }, [starter, flourInitialized])

  useEffect(() => {
    if (!tempInitialized && profile) {
      setAmbientTempC(profile.defaultAmbientTempC)
      setTempInitialized(true)
    }
  }, [profile, tempInitialized])

  function selectPreset(index: number) {
    setPresetIndex(index)
    setRatio(RATIO_PRESETS[index].ratio)
  }

  function selectCustom() {
    setPresetIndex('custom')
  }

  function updateCustomRatio(field: keyof FeedingRatio, value: number) {
    setRatio((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!starterId) return

    setSubmitting(true)
    await feedingRepository.create({
      starterId,
      ratio,
      flourType,
      ambientTempC,
      notes: notes.trim() || undefined,
    })
    navigate(`/starter/${starterId}`)
  }

  const hydration = calculateHydrationPercent(ratio)

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold text-stone-800">Feed {starter?.name ?? 'starter'}</h1>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <fieldset className="block">
          <span className="text-sm font-medium text-stone-700">Ratio (starter:flour:water)</span>
          <div className="mt-1 flex flex-wrap gap-2">
            {RATIO_PRESETS.map((preset, index) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => selectPreset(index)}
                className={`rounded-md px-3 py-1.5 text-sm ${
                  presetIndex === index ? 'bg-amber-800 text-white' : 'bg-stone-100 text-stone-700'
                }`}
              >
                {preset.label}
              </button>
            ))}
            <button
              type="button"
              onClick={selectCustom}
              className={`rounded-md px-3 py-1.5 text-sm ${
                presetIndex === 'custom' ? 'bg-amber-800 text-white' : 'bg-stone-100 text-stone-700'
              }`}
            >
              Custom
            </button>
          </div>

          {presetIndex === 'custom' && (
            <div className="mt-2 flex gap-2">
              {(['starter', 'flour', 'water'] as const).map((field) => (
                <label key={field} className="flex-1 text-xs text-stone-500">
                  {field}
                  <input
                    type="number"
                    min={0}
                    value={ratio[field]}
                    onChange={(e) => updateCustomRatio(field, Number(e.target.value))}
                    className="mt-0.5 block w-full rounded-md border border-stone-300 px-2 py-1 text-sm text-stone-800"
                  />
                </label>
              ))}
            </div>
          )}

          <p className="mt-1 text-xs text-stone-500">{hydration.toFixed(0)}% hydration</p>
        </fieldset>

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
          <span className="text-sm font-medium text-stone-700">Ambient temperature (°C)</span>
          <input
            type="number"
            value={ambientTempC}
            onChange={(e) => setAmbientTempC(Number(e.target.value))}
            className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-stone-700">Notes</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2"
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-amber-800 px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          Log feed
        </button>
      </form>
    </div>
  )
}
