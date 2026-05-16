'use client'

import { useMemo, useState } from 'react'
import WardMap, { type WardMapDatum } from '@/components/ward-intelligence/WardMap'
import wardMap from '@/lib/ward-map/swansea-ward-paths.json'

const placeholderData: WardMapDatum[] = wardMap.wards.slice(0, 6).map((ward, index) => ({
  wardCode: ward.wardCode,
  colour: ['#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8'][index],
  label: 'Placeholder intensity',
}))

export default function WardIntelligenceShell() {
  const [selectedWardCode, setSelectedWardCode] = useState<string | null>(null)

  const selectedWard = useMemo(
    () => wardMap.wards.find((ward) => ward.wardCode === selectedWardCode) ?? null,
    [selectedWardCode]
  )

  return (
    <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
      <article className="surface p-4 sm:p-6">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Map preview</p>
        <WardMap data={placeholderData} selectedWardCode={selectedWardCode} onWardSelect={setSelectedWardCode} />
        <p className="mt-3 text-xs text-zinc-500">Placeholder colouring for shell preview only.</p>
      </article>

      <aside className="surface p-4 sm:p-6">
        <h2 className="text-lg font-semibold">Ward details</h2>
        {!selectedWard ? (
          <p className="mt-3 text-sm text-zinc-600">Select a ward to begin exploring local context.</p>
        ) : (
          <div className="mt-3 space-y-2 text-sm text-zinc-700">
            <p>
              <span className="font-semibold">Ward:</span> {selectedWard.wardName}
            </p>
            <p>
              <span className="font-semibold">Code:</span> {selectedWard.wardCode}
            </p>
          </div>
        )}

        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Future layers</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-700">
            <li>Population</li>
            <li>Electorate</li>
            <li>Turnout</li>
            <li>Leafletting coverage</li>
            <li>Local election results</li>
          </ul>
        </div>
      </aside>
    </section>
  )
}
