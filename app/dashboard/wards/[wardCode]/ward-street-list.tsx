'use client'

import { useMemo, useState } from 'react'
import { StreetUpdateForm } from './street-update-form'
import { updateStreetAction } from './actions'

type Street = {
  id: string
  street_name: string
  road_type: string | null
  ward_code: string
  status: 'not_started' | 'delivered' | 'needs_revisit' | 'no_residences'
  notes: string | null
  updated_at: string
}

export function WardStreetList({ streets }: { streets: Street[] }) {
  const [batch, setBatch] = useState<Street[]>([])
  const [isMissionSaved, setIsMissionSaved] = useState(false)

  const batchIds = useMemo(
    () => new Set(batch.map((street) => street.id)),
    [batch]
  )

  function toggleBatch(street: Street) {
    if (isMissionSaved) return

    setBatch((current) => {
      const exists = current.some((item) => item.id === street.id)

      if (exists) {
        return current.filter((item) => item.id !== street.id)
      }

      return [...current, street]
    })
  }

  function clearBatch() {
    setBatch([])
    setIsMissionSaved(false)
  }

  function saveMission() {
    if (batch.length === 0) return
    setIsMissionSaved(true)
  }

  function editMission() {
    setIsMissionSaved(false)
  }

  return (
    <div className="space-y-4">
      {batch.length > 0 && (
        <section className="surface border-t-4 border-t-amber-400 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                Mission planner
              </p>

              <h3 className="mt-1 text-lg font-semibold">
                {isMissionSaved ? 'Today’s route' : 'Build a route'}
              </h3>

              <p className="text-sm text-zinc-500">
                {batch.length} streets selected
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {isMissionSaved ? (
                <button
                  type="button"
                  onClick={editMission}
                  className="rounded border px-3 py-1 text-sm text-[#051b3a]"
                >
                  Edit mission
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={saveMission}
                    className="rounded bg-[#051b3a] px-3 py-1 text-sm text-white"
                  >
                    Save mission
                  </button>

                  <button
                    type="button"
                    onClick={clearBatch}
                    className="rounded border px-3 py-1 text-sm text-red-700"
                  >
                    Clear
                  </button>
                </>
              )}
            </div>
          </div>

          <ul className="mt-4 space-y-2 text-sm">
            {batch.map((street, index) => (
              <li
                key={street.id}
                className="rounded bg-zinc-50 px-3 py-3"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">
                      {index + 1}. {street.street_name}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {street.road_type ?? 'Road type unknown'}
                    </p>
                  </div>

                  {isMissionSaved ? (
                    <form
                      action={updateStreetAction}
                      className="flex gap-2"
                    >
                      <input
                        type="hidden"
                        name="streetId"
                        value={street.id}
                      />
                      <input
                        type="hidden"
                        name="wardCode"
                        value={street.ward_code}
                      />
                      <input
                        type="hidden"
                        name="notes"
                        value={street.notes ?? ''}
                      />

                      <select
                        name="status"
                        defaultValue={street.status}
                        className="rounded border px-2 py-1 text-sm"
                      >
                        <option value="not_started">Not started</option>
                        <option value="delivered">Delivered</option>
                        <option value="needs_revisit">Needs revisit</option>
                        <option value="no_residences">No residences</option>
                      </select>

                      <button
                        type="submit"
                        className="rounded bg-[#051b3a] px-3 py-1 text-sm text-white"
                      >
                        Update
                      </button>
                    </form>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleBatch(street)}
                      className="text-xs text-red-600 underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        {streets.map((street) => (
          <StreetUpdateForm
            key={street.id}
            street={street}
            isInBatch={batchIds.has(street.id)}
            onToggleBatch={() => toggleBatch(street)}
          />
        ))}

        {streets.length === 0 && (
          <p className="text-sm text-zinc-300">
            No matching streets found.
          </p>
        )}
      </section>
    </div>
  )
}