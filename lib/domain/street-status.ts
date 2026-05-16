export const STREET_STATUSES = [
  'not_started',
  'delivered',
  'needs_revisit',
  'no_residences',
] as const

export type StreetStatus = (typeof STREET_STATUSES)[number]

const STREET_STATUS_LABELS: Record<StreetStatus, string> = {
  not_started: 'Not started',
  delivered: 'Delivered',
  needs_revisit: 'Needs revisit',
  no_residences: 'No residences',
}

export function isStreetStatus(value: string): value is StreetStatus {
  return STREET_STATUSES.includes(value as StreetStatus)
}

export function streetStatusLabel(status: StreetStatus): string {
  return STREET_STATUS_LABELS[status]
}

export const streetStatusOptions = STREET_STATUSES.map((status) => ({
  value: status,
  label: streetStatusLabel(status),
}))
