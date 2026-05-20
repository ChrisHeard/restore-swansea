export const ACCOUNT_ROLES = ['administrator', 'member', 'guest'] as const

export type AccountRole = (typeof ACCOUNT_ROLES)[number]

export const SPECIAL_GUEST_EMAIL = 'specialguest@restoreswansea.local'

const ACCOUNT_ROLE_LABELS: Record<AccountRole, string> = {
  administrator: 'Administrator',
  member: 'Member',
  guest: 'Guest',
}

const ACCOUNT_ROLE_DESCRIPTIONS: Record<AccountRole, string> = {
  administrator: 'Platform administration account',
  member: 'Swansea campaign member',
  guest: 'Demonstration / review access',
}

export function isAccountRole(value: string): value is AccountRole {
  return ACCOUNT_ROLES.includes(value as AccountRole)
}

export function fallbackAccountRoleForEmail(email: string | null): AccountRole {
  return email === SPECIAL_GUEST_EMAIL ? 'guest' : 'member'
}

export function accountRoleLabel(role: AccountRole): string {
  return ACCOUNT_ROLE_LABELS[role]
}

export function accountRoleDescription(role: AccountRole): string {
  return ACCOUNT_ROLE_DESCRIPTIONS[role]
}
