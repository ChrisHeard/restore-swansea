'use client'

import { useMemo, useState } from 'react'
import WardMap, { type WardMapDatum } from '@/components/ward-intelligence/WardMap'
import { formatMetricValue } from '@/components/ward-intelligence/formatMetricValue'
import wardMap from '@/lib/ward-map/swansea-ward-paths.json'
import type { WardIntelligenceMetricRow } from './page'

type Props = {
  metricRows?: WardIntelligenceMetricRow[] | null
  metricsError?: string | null
}

function colourForValue(value: number | null, min: number, max: number) {
  if (value === null || Number.isNaN(value)) return '#e2e8f0'
  if (min === max) return '#3b82f6'
  const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)))
  const lightness = 88 - ratio * 46
  return `hsl(214 90% ${lightness}%)`
}

export default function WardIntelligenceShell({
  metricRows,
  metricsError = null,
}: Props) {
  const safeMetricRows = Array.isArray(metricRows) ? metricRows : []
  const [selectedWardCode, setSelectedWardCode] = useState<string | null>(null)

  const metricOptions = useMemo(() => {
    const byKey = new Map<string, { key: string; label: string; year: number | null; unit: string | null }>()
    for (const row of safeMetricRows) {
      if (!byKey.has(row.metric_key)) {
        byKey.set(row.metric_key, {
          key: row.metric_key,
          label: row.metric_label,
          year: row.source_year,
          unit: row.metric_unit,
        })
      }
    }
    return Array.from(byKey.values())
  }, [safeMetricRows])

  const defaultMetric = useMemo(() => {
    if (metricOptions.length === 0) return null
    return metricOptions.find((option) => option.key === 'total_population_2021')?.key ?? metricOptions[0].key
  }, [metricOptions])

  const [selectedMetricKey, setSelectedMetricKey] = useState<string | null>(null)
  const activeMetricKey = selectedMetricKey ?? defaultMetric

  const selectedWard = useMemo(
    () => wardMap.wards.find((ward) => ward.wardCode === selectedWardCode) ?? null,
    [selectedWardCode]
  )

  const selectedMetricRows = useMemo(
() => safeMetricRows.filter((row) => row.metric_key === activeMetricKey),
[safeMetricRows, activeMetricKey]
  )

  const numericValues = useMemo(
    () => selectedMetricRows.map((row) => row.metric_value).filter((value): value is number => typeof value === 'number'),
    [selectedMetricRows]
  )
  const minValue = numericValues.length > 0 ? Math.min(...numericValues) : null
  const maxValue = numericValues.length > 0 ? Math.max(...numericValues) : null

  const mapData: WardMapDatum[] = useMemo(() => {
    if (!activeMetricKey || minValue === null || maxValue === null) return []
    return selectedMetricRows.map((row) => ({
      wardCode: row.ward_code,
      value: row.metric_value,
      label: `${row.metric_label}: ${formatMetricValue(row.metric_value, row.metric_unit)}`,
      colour: colourForValue(row.metric_value, minValue, maxValue),
    }))
  }, [activeMetricKey, maxValue, minValue, selectedMetricRows])

  const selectedMetric = metricOptions.find((option) => option.key === activeMetricKey) ?? null
  const selectedWardMetric = selectedMetricRows.find((row) => row.ward_code === selectedWardCode) ?? null

  const mapStateMessage = metricsError
    ? 'Ward intelligence metrics are not available yet.'
    : safeMetricRows.length === 0
      ? 'No ward intelligence metrics found.'
      : null

  return (
    <section className="surface h-[calc(100vh-230px)] min-h-[620px] overflow-hidden p-0">
      <div className="grid h-full lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="flex flex-col border-b border-zinc-200 p-4 sm:p-5 lg:border-r lg:border-b-0">
          <h2 className="text-base font-semibold text-[#051b3a]">Map layers</h2>
          <p className="mt-1 text-xs text-zinc-500">Choose a ward-level metric to colour the map.</p>
          <fieldset className="mt-3 flex-1 overflow-hidden" disabled={metricOptions.length === 0}>
            <legend className="sr-only">Ward map layer options</legend>
            <div className="h-full space-y-1.5 overflow-y-auto pr-1">
              {metricOptions.map((option) => {
                const isActive = activeMetricKey === option.key
                return (
                  <label
                    key={option.key}
                    htmlFor={`metric-layer-${option.key}`}
                    className={`block cursor-pointer rounded-lg border px-3 py-1.5 transition-colors ${
                      isActive
                        ? 'border-[#0f52b0] bg-blue-50 text-[#051b3a]'
                        : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                    }`}
                  >
                    <input
                      id={`metric-layer-${option.key}`}
                      type="radio"
                      name="metric-layer"
                      value={option.key}
                      checked={isActive}
                      onChange={(event) => setSelectedMetricKey(event.target.value)}
                      className="sr-only"
                    />
                    <span className="block text-sm/5 font-medium">{option.label}</span>
                    {option.year ? <span className="mt-0.5 block text-[11px] leading-4 text-zinc-500">Source: {option.year}</span> : null}
                  </label>
                )
              })}
            </div>
          </fieldset>

          <div className="mt-3 rounded-lg border border-zinc-200 bg-slate-50 p-3 text-xs text-zinc-700">
            <p className="font-semibold text-[#051b3a]">{selectedMetric?.label ?? 'Selected layer'}</p>
            <div className="mt-2 h-2 w-full rounded-full bg-gradient-to-r from-blue-100 via-blue-300 to-blue-700" aria-hidden="true" />
            {minValue === null || maxValue === null ? (
              <p className="mt-2">No values available for this layer.</p>
            ) : (
              <p className="mt-2">
                Low {formatMetricValue(minValue, selectedMetric?.unit)} · High {formatMetricValue(maxValue, selectedMetric?.unit)}
              </p>
            )}
          </div>
        </aside>

        <article className="border-b border-zinc-200 p-3 sm:p-4 lg:border-b-0">
          <section className="relative h-full min-h-[620px] overflow-hidden rounded-xl bg-slate-50 p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 pr-24">
              <div>
                <h2 className="text-base font-semibold text-[#051b3a]">Swansea ward map</h2>
                <p className="text-xs text-zinc-500">Click a ward to inspect local context.</p>
              </div>
              <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-semibold text-[#0f52b0]">
                2021 Census
              </span>
            </div>
            {mapStateMessage ? <p className="mb-3 rounded-md bg-zinc-100 p-3 text-sm text-zinc-700">{mapStateMessage}</p> : null}

            <div className="lg:absolute lg:right-4 lg:top-4 lg:z-20 lg:w-[280px]">
              <div className="rounded-lg border border-zinc-200 bg-white/95 p-3 shadow-sm backdrop-blur">
                {!selectedWard ? (
                  <>
                    <p className="text-sm font-semibold text-[#051b3a]">Select a ward</p>
                    <p className="mt-1 text-xs text-zinc-600">Click the map to inspect local context.</p>
                  </>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-[#051b3a]">{selectedWard.wardName}</p>
                        <p className="text-xs font-medium tracking-wide text-zinc-500">{selectedWard.wardCode}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedWardCode(null)}
                        className="rounded-md border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100"
                        aria-label="Clear selected ward"
                      >
                        Clear
                      </button>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Selected layer</p>
                      <p className="mt-0.5 text-xs font-medium text-zinc-700">{selectedMetric?.label ?? 'Not available'}</p>
                    </div>
                    <div>
                      <p className="text-2xl font-semibold text-[#051b3a]">
                        {selectedWardMetric
                          ? formatMetricValue(selectedWardMetric.metric_value, selectedWardMetric.metric_unit)
                          : 'No value available for this layer.'}
                      </p>
                      {selectedWardMetric?.metric_value !== null && minValue !== null && maxValue !== null && minValue !== maxValue ? (
                        <p className="mt-1 text-xs text-zinc-500">
                          {selectedWardMetric.metric_value <= minValue + (maxValue - minValue) / 3
                            ? 'Lower range'
                            : selectedWardMetric.metric_value >= maxValue - (maxValue - minValue) / 3
                              ? 'Higher range'
                              : 'Mid range'}
                        </p>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="relative h-[520px] overflow-hidden rounded-xl bg-slate-50 lg:h-[calc(100%-2.25rem)]">
              <div className="absolute inset-2 flex items-center justify-center lg:inset-4">
                <WardMap data={mapData} selectedWardCode={selectedWardCode} onWardSelect={setSelectedWardCode} />
              </div>
            </div>
          </section>
        </article>

      </div>
    </section>
  )
}
