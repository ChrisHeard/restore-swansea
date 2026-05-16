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
    <section className="grid items-start gap-4 lg:grid-cols-[260px_minmax(0,1fr)_320px]">
      <aside className="surface p-4 sm:p-6">
        <h2 className="text-lg font-semibold">Map layers</h2>
        <p className="mt-1 text-xs text-zinc-500">Choose a ward-level metric to colour the map.</p>
        <fieldset className="mt-4" disabled={metricOptions.length === 0}>
          <legend className="sr-only">Ward map layer options</legend>
          <div className="max-h-[280px] space-y-2 overflow-y-auto pr-1">
            {metricOptions.map((option) => (
              <label
                key={option.key}
                htmlFor={`metric-layer-${option.key}`}
                className="flex cursor-pointer items-start gap-2 rounded-md border border-transparent px-2 py-1 hover:bg-zinc-50"
              >
                <input
                  id={`metric-layer-${option.key}`}
                  type="radio"
                  name="metric-layer"
                  value={option.key}
                  checked={activeMetricKey === option.key}
                  onChange={(event) => setSelectedMetricKey(event.target.value)}
                  className="mt-0.5 h-4 w-4"
                />
                <span className="text-sm text-zinc-700">{option.year ? `${option.label}, ${option.year}` : option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="mt-4 rounded-md bg-slate-50 p-3 text-xs text-zinc-700">
          <p className="font-semibold">{selectedMetric?.label ?? 'Selected layer'}</p>
          {minValue === null || maxValue === null ? (
            <p className="mt-1">No values available for this layer.</p>
          ) : (
            <p className="mt-1">
              Low {formatMetricValue(minValue, selectedMetric?.unit)} → High {formatMetricValue(maxValue, selectedMetric?.unit)}
            </p>
          )}
        </div>
      </aside>

      <article className="surface p-3 sm:p-4">
        {mapStateMessage ? <p className="mb-3 rounded-md bg-zinc-100 p-3 text-sm text-zinc-700">{mapStateMessage}</p> : null}
        <div className="h-[520px] overflow-hidden rounded-lg bg-[#f8fafc] lg:h-[620px] xl:h-[680px]">
          <WardMap data={mapData} selectedWardCode={selectedWardCode} onWardSelect={setSelectedWardCode} />
        </div>
      </article>

      <aside className="surface min-h-[320px] p-4 sm:p-6">
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
            <p>
              <span className="font-semibold">Selected layer:</span> {selectedMetric?.label ?? 'Not available'}
            </p>
            <p>
              <span className="font-semibold">Value:</span>{' '}
              {selectedWardMetric ? formatMetricValue(selectedWardMetric.metric_value, selectedWardMetric.metric_unit) : 'No value available for this layer.'}
            </p>
          </div>
        )}
      </aside>
    </section>
  )
}
