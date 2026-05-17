'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import WardMap, {
  type WardMapDatum,
} from '@/components/ward-intelligence/WardMap'
import { formatMetricValue } from '@/components/ward-intelligence/formatMetricValue'
import wardMap from '@/lib/ward-map/swansea-ward-paths.json'
import type { WardIntelligenceMetricRow } from './page'

type Props = {
  metricRows?: WardIntelligenceMetricRow[] | null
  metricsError?: string | null
}

const POPUP_FADE_DURATION_MS = 200

// Temporarily hidden until complete candidate-level 2022 results are imported.
const HIDDEN_METRIC_KEYS = new Set(['conservative_vote_share_2022_pct'])

function sourceBadgeForMetric(metric: { key: string; year: number | null } | null) {
  if (!metric) return 'Ward data'

  if (metric.key === 'election_2022_turnout_pct') {
    return '2022 local election'
  }

  if (metric.year === 2021) {
    return '2021 Census'
  }

  if (metric.year) {
    return `${metric.year} ward data`
  }

  return 'Ward data'
}

function displayMetricLabel(label: string, key: string) {
  if (key === 'election_2022_turnout_pct') return 'Local election turnout'
  return label
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
  const safeMetricRows = useMemo(
    () =>
      (Array.isArray(metricRows) ? metricRows : []).filter(
        (row) => !HIDDEN_METRIC_KEYS.has(row.metric_key)
      ),
    [metricRows]
  )

  const [hoveredWardCode, setHoveredWardCode] = useState<string | null>(null)
  const [popupWardCode, setPopupWardCode] = useState<string | null>(null)
  const [isPopupVisible, setIsPopupVisible] = useState(false)
  const popupHideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearPopupHideTimeout = useCallback(() => {
    if (popupHideTimeoutRef.current) {
      clearTimeout(popupHideTimeoutRef.current)
      popupHideTimeoutRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => clearPopupHideTimeout()
  }, [clearPopupHideTimeout])

  const metricOptions = useMemo(() => {
    const byKey = new Map<
      string,
      { key: string; label: string; year: number | null; unit: string | null }
    >()

    for (const row of safeMetricRows) {
      if (!byKey.has(row.metric_key)) {
        byKey.set(row.metric_key, {
          key: row.metric_key,
          label: displayMetricLabel(row.metric_label, row.metric_key),
          year: row.source_year,
          unit: row.metric_unit,
        })
      }
    }

    return Array.from(byKey.values())
  }, [safeMetricRows])

  const defaultMetric = useMemo(() => {
    if (metricOptions.length === 0) return null

    return (
      metricOptions.find((option) => option.key === 'total_population_2021')
        ?.key ?? metricOptions[0].key
    )
  }, [metricOptions])

  const [selectedMetricKey, setSelectedMetricKey] = useState<string | null>(null)
  const activeMetricKey = selectedMetricKey ?? defaultMetric

  const handleWardHover = useCallback(
    (wardCode: string) => {
      clearPopupHideTimeout()
      setHoveredWardCode(wardCode)
      setPopupWardCode(wardCode)
      setIsPopupVisible(true)
    },
    [clearPopupHideTimeout]
  )

  const handleWardLeave = useCallback(() => {
    setHoveredWardCode(null)
    setIsPopupVisible(false)
    clearPopupHideTimeout()

    popupHideTimeoutRef.current = setTimeout(() => {
      setPopupWardCode(null)
      popupHideTimeoutRef.current = null
    }, POPUP_FADE_DURATION_MS)
  }, [clearPopupHideTimeout])

  const handleWardSelect = useCallback(
    (wardCode: string) => {
      handleWardHover(wardCode)
    },
    [handleWardHover]
  )

  const popupWard = useMemo(
    () =>
      wardMap.wards.find((ward) => ward.wardCode === popupWardCode) ?? null,
    [popupWardCode]
  )

  const selectedMetricRows = useMemo(
    () => safeMetricRows.filter((row) => row.metric_key === activeMetricKey),
    [safeMetricRows, activeMetricKey]
  )

  const numericValues = useMemo(
    () =>
      selectedMetricRows
        .map((row) => row.metric_value)
        .filter((value): value is number => typeof value === 'number'),
    [selectedMetricRows]
  )

  const minValue = numericValues.length > 0 ? Math.min(...numericValues) : null
  const maxValue = numericValues.length > 0 ? Math.max(...numericValues) : null

  const mapData: WardMapDatum[] = useMemo(() => {
    if (!activeMetricKey || minValue === null || maxValue === null) return []

    return selectedMetricRows.map((row) => ({
      wardCode: row.ward_code,
      value: row.metric_value,
      label: `${displayMetricLabel(row.metric_label, row.metric_key)}: ${formatMetricValue(
        row.metric_value,
        row.metric_unit
      )}`,
      colour: colourForValue(row.metric_value, minValue, maxValue),
    }))
  }, [activeMetricKey, maxValue, minValue, selectedMetricRows])

  const selectedMetric =
    metricOptions.find((option) => option.key === activeMetricKey) ?? null

  const popupWardMetric =
    selectedMetricRows.find((row) => row.ward_code === popupWardCode) ?? null

  const mapStateMessage = metricsError
    ? 'Ward intelligence metrics are not available yet.'
    : safeMetricRows.length === 0
      ? 'No ward intelligence metrics found.'
      : null

  return (
    <section className="surface overflow-hidden p-0">
      <div className="grid min-h-[620px] lg:grid-cols-[190px_minmax(0,1fr)] xl:grid-cols-[200px_minmax(0,1fr)]">
        <aside className="flex flex-col border-b border-zinc-200 p-4 sm:p-5 lg:border-r lg:border-b-0">
          <h2 className="text-base font-semibold text-[#051b3a]">
            Map layers
          </h2>

          <p className="mt-1 text-xs text-zinc-500">
            Choose a ward-level metric to colour the map.
          </p>

          <fieldset
            className="mt-3 flex-1 overflow-hidden"
            disabled={metricOptions.length === 0}
          >
            <legend className="sr-only">Ward map layer options</legend>
            <div className="h-full space-y-1.5 overflow-y-auto pr-1">
              {metricOptions.map((option) => {
                const isActive = activeMetricKey === option.key

                return (
                  <label
                    key={option.key}
                    htmlFor={`metric-layer-${option.key}`}
                    className={`block cursor-pointer rounded-md border px-2 py-1.5 text-[12px] leading-snug transition-colors ${
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
                      onChange={(event) =>
                        setSelectedMetricKey(event.target.value)
                      }
                      className="sr-only"
                    />

                    <span className="block text-[13px] font-medium leading-snug">
                      {option.label}
                    </span>

                    {option.year ? (
                      <span className="mt-0.5 block text-[10px] leading-3 text-zinc-500">
                        Source: {option.year}
                      </span>
                    ) : null}
                  </label>
                )
              })}
            </div>
          </fieldset>

          <div className="mt-3 rounded-lg border border-zinc-200 bg-slate-50 p-3 text-xs text-zinc-700">
            <p className="font-semibold text-[#051b3a]">
              {selectedMetric?.label ?? 'Selected layer'}
            </p>

            <div
              className="mt-2 h-2 w-full rounded-full bg-gradient-to-r from-blue-100 via-blue-300 to-blue-700"
              aria-hidden="true"
            />

            {minValue === null || maxValue === null ? (
              <p className="mt-2">No values available for this layer.</p>
            ) : (
              <p className="mt-2">
                Low {formatMetricValue(minValue, selectedMetric?.unit)} · High{' '}
                {formatMetricValue(maxValue, selectedMetric?.unit)}
              </p>
            )}
          </div>
        </aside>

        <article className="border-b border-zinc-200 p-3 sm:p-4 lg:border-b-0">
          <section className="relative min-h-[620px] overflow-hidden bg-slate-50 p-4">
            <div className="relative z-10 mb-2 flex flex-wrap items-center justify-between gap-2 pr-24">
              <div>
                <h2 className="text-base font-semibold text-[#051b3a]">
                  Swansea ward map
                </h2>

                <p className="text-xs text-zinc-500">
                  Hover a ward to inspect local context.
                </p>
              </div>

              <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-semibold text-[#0f52b0]">
                {sourceBadgeForMetric(selectedMetric)}
              </span>
            </div>

            {mapStateMessage ? (
              <p className="relative z-10 mb-3 rounded-md bg-zinc-100 p-3 text-sm text-zinc-700">
                {mapStateMessage}
              </p>
            ) : null}

            <div className="pointer-events-none absolute left-4 top-20 z-30">
              <div
                className={`w-56 rounded-xl border border-zinc-200 bg-white/95 p-3 shadow-lg backdrop-blur transition-all duration-200 ease-out ${
                  popupWard && isPopupVisible
                    ? 'translate-y-0 opacity-100'
                    : 'translate-y-1 opacity-0'
                }`}
              >
                {popupWard ? (
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-semibold text-[#051b3a]">
                        {popupWard.wardName}
                      </p>

                      <p className="text-xs font-medium tracking-wide text-zinc-500">
                        {popupWard.wardCode}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                        {selectedMetric?.label ?? 'Selected layer'}
                      </p>

                      <p className="mt-0.5 text-sm font-semibold text-[#051b3a]">
                        {popupWardMetric
                          ? formatMetricValue(
                              popupWardMetric.metric_value,
                              popupWardMetric.metric_unit
                            )
                          : 'No value available'}
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="absolute inset-x-4 bottom-4 top-16 z-0 overflow-hidden rounded-xl bg-slate-50">
              <div className="h-full w-full">
                <WardMap
                  data={mapData}
                  hoveredWardCode={hoveredWardCode}
                  onWardSelect={handleWardSelect}
                  onWardHover={handleWardHover}
                  onWardLeave={handleWardLeave}
                />
              </div>
            </div>
          </section>
        </article>
      </div>
    </section>
  )
}