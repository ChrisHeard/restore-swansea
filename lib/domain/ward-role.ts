export const WARD_ROLES = ['ward_leader', 'member'] as const

export type WardRole = (typeof WARD_ROLES)[number]

const WARD_ROLE_LABELS: Record<WardRole, string> = {
  ward_leader: 'Ward leader',
  member: 'Ward member',
}

export function isWardRole(value: string): value is WardRole {
  return WARD_ROLES.includes(value as WardRole)
}

export function wardRoleLabel(role: WardRole): string {
  return WARD_ROLE_LABELS[role]
}
