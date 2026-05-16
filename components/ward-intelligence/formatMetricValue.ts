export function formatMetricValue(value: number | null | undefined, unit?: string | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return 'Not available'

  if (unit === 'percent') return `${value.toFixed(1)}%`
  if (unit === 'count') return new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 }).format(value)

  return new Intl.NumberFormat('en-GB', { maximumFractionDigits: 1 }).format(value)
}
