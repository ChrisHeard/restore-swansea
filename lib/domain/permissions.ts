import type { User } from '@supabase/supabase-js'
import {
  fallbackAccountRoleForEmail,
  isAccountRole,
  type AccountRole,
} from '@/lib/domain/account-role'
import { isWardRole, type WardRole } from '@/lib/domain/ward-role'

type MaybeSingleResult = Promise<{
  data: Record<string, unknown> | null
  error: unknown
}>

type QueryBuilder = {
  eq: (column: string, value: string) => QueryBuilder
  maybeSingle: () => MaybeSingleResult
}

type SupabaseServerClient = {
  auth: {
    getUser: () => Promise<{
      data: { user: User | null }
      error: unknown
    }>
  }
  from: (table: string) => {
    select: (columns: string) => QueryBuilder
  }
}

export type PermissionContext = {
  user: User
  accountRole: AccountRole
}

export type WardPermissionContext = PermissionContext & {
  wardCode: string
  wardRole: WardRole | null
}

export class AuthenticationRequiredError extends Error {
  constructor(message = 'You must be signed in to do this') {
    super(message)
    this.name = 'AuthenticationRequiredError'
  }
}

export class PermissionDeniedError extends Error {
  constructor(message = 'You do not have permission to do this') {
    super(message)
    this.name = 'PermissionDeniedError'
  }
}

export async function requireUser(
  supabase: unknown
): Promise<PermissionContext> {
  const client = supabase as SupabaseServerClient

  const {
    data: { user },
  } = await client.auth.getUser()

  if (!user) {
    throw new AuthenticationRequiredError()
  }

  return {
    user,
    accountRole: await getAccountRole(client, user),
  }
}

export async function getWardPermissionContext(
  supabase: unknown,
  wardCode: string
): Promise<WardPermissionContext> {
  const context = await requireUser(supabase)
  const client = supabase as SupabaseServerClient

  return {
    ...context,
    wardCode,
    wardRole: await getWardRole(client, context.user.id, wardCode),
  }
}

export async function requireCampaignWriteAccess(
  supabase: unknown,
  wardCode: string
): Promise<WardPermissionContext> {
  const context = await getWardPermissionContext(supabase, wardCode)

  if (context.accountRole === 'guest') {
    throw new PermissionDeniedError('Guest accounts cannot change campaign data')
  }

  if (
    context.accountRole === 'administrator' ||
    context.wardRole === 'ward_leader' ||
    context.wardRole === 'member'
  ) {
    return context
  }

  throw new PermissionDeniedError(
    'Only administrators or assigned ward team members can change campaign data'
  )
}

export async function requireWardLeaderAccess(
  supabase: unknown,
  wardCode: string
): Promise<WardPermissionContext> {
  const context = await getWardPermissionContext(supabase, wardCode)

  if (
    context.accountRole === 'administrator' ||
    context.wardRole === 'ward_leader'
  ) {
    return context
  }

  throw new PermissionDeniedError('Only administrators or ward leaders can do this')
}

async function getAccountRole(
  client: SupabaseServerClient,
  user: User
): Promise<AccountRole> {
  const fallbackRole = fallbackAccountRoleForEmail(user.email ?? null)

  try {
    const { data } = await client
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    const roleValue =
      typeof data?.role === 'string' ? data.role : null

    return roleValue && isAccountRole(roleValue) ? roleValue : fallbackRole
  } catch {
    return fallbackRole
  }
}

async function getWardRole(
  client: SupabaseServerClient,
  userId: string,
  wardCode: string
): Promise<WardRole | null> {
  try {
    const { data } = await client
      .from('ward_memberships')
      .select('ward_role')
      .eq('user_id', userId)
      .eq('ward_code', wardCode)
      .maybeSingle()

    const roleValue = typeof data?.ward_role === 'string' ? data.ward_role : null

    return roleValue && isWardRole(roleValue) ? roleValue : null
  } catch {
    return null
  }
}
