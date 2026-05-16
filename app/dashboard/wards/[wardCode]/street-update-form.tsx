'use client'

import { useState, useTransition } from 'react'
import { postWardMessageAction, updateStreetAction } from './actions'
import Image from 'next/image'
import {
  streetStatusLabel,
  streetStatusOptions,
  type StreetStatus,
} from '@/lib/domain/street-status'

type Street = {
  id: string
  street_name: string
  road_type: string | null
  ward_code: string
  status: StreetStatus
  notes: string | null
  updated_at: string
}

function formatDate(value: string | null) {
  if (!value) return 'Not updated'
  return new Date(value).toISOString().slice(0, 16).replace('T', ' ')
}

function statusClasses(status: Street['status']) {
  if (status === 'delivered') {
    return 'bg-emerald-100 text-emerald-800'
  }

  if (status === 'needs_revisit') {
    return 'bg-amber-100 text-amber-800'
  }

  if (status === 'no_residences') {
    return 'bg-slate-200 text-slate-700'
  }

  return 'bg-zinc-100 text-zinc-700'
}

export function StreetUpdateForm({
  street,
  isInBatch,
  onToggleBatch,
}: {
  street: Street
  isInBatch: boolean
  onToggleBatch: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <form
      action={(formData) =>
        startTransition(() => updateStreetAction(formData))
      }
      className="surface overflow-hidden p-0"
    >
      <input type="hidden" name="streetId" value={street.id} />
      <input type="hidden" name="wardCode" value={street.ward_code} />

      <div className="flex items-center gap-3 p-4">
<button
  type="button"
  onClick={() => setIsExpanded((current) => !current)}
  aria-expanded={isExpanded}
  aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${street.street_name}`}
  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#051b3a]/30 bg-white transition-colors hover:border-[#051b3a] hover:bg-[#051b3a]/8"
>
  <Image
    src="/graphics/square_arrow.png"
    alt=""
    width={16}
    height={16}
    className={`transition-transform duration-200 ${
      isExpanded ? 'rotate-90' : ''
    }`}
  />
</button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-base font-semibold text-zinc-950">
              {street.street_name}
            </p>

            <span
              className={`rounded-full px-2 py-1 text-xs font-medium ${statusClasses(
                street.status
              )}`}
            >
              {streetStatusLabel(street.status)}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleBatch}
          className={`rounded border px-3 py-1.5 text-sm transition ${
            isInBatch
              ? 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100'
              : 'border-[#051b3a]/30 text-[#051b3a] hover:bg-[#051b3a] hover:text-white'
          }`}
        >
          {isInBatch ? 'Remove from shortlist' : 'Shortlist'}
        </button>
      </div>

      <div
        className={`grid transition-[grid-template-rows] duration-200 ease-out ${
          isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="border-t border-zinc-200 p-4">
            <div className="mb-4 text-xs text-zinc-500">
              Updated {formatDate(street.updated_at)}
            </div>

            <div className="grid gap-3 md:grid-cols-6 md:items-end">
              <label className="space-y-1 md:col-span-2">
                <span className="text-xs font-medium text-zinc-500">
                  Status
                </span>

                <select
                  name="status"
                  defaultValue={street.status}
                  className="w-full rounded border px-2 py-2 text-sm"
                >
                  {streetStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1 md:col-span-3">
                <span className="text-xs font-medium text-zinc-500">
                  Notes
                </span>

                <input
                  name="notes"
                  defaultValue={street.notes ?? ''}
                  placeholder="Notes"
                  className="w-full rounded border px-2 py-2 text-sm"
                />
              </label>

              <button
                disabled={pending}
                type="submit"
                className="rounded bg-[#051b3a] px-3 py-2 text-sm text-white disabled:opacity-60"
              >
                {pending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}

export function WardMessageForm({ wardCode }: { wardCode: string }) {
  const [pending, startTransition] = useTransition()

  return (
    <form
      action={(formData) =>
        startTransition(() => postWardMessageAction(formData))
      }
      className="space-y-2"
    >
      <input type="hidden" name="wardCode" value={wardCode} />

      <textarea
        name="message"
        required
        className="w-full rounded border p-2 text-sm"
        rows={3}
        placeholder="Post a quick ward update"
      />

      <button
        disabled={pending}
        type="submit"
        className="rounded bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-60"
      >
        {pending ? 'Posting…' : 'Post message'}
      </button>
    </form>
  )
}
