import type { User } from '@supabase/supabase-js'
import { isAccountRole, type AccountRole } from '@/lib/domain/account-role'

type SupabaseServerClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: unknown }>
      }
    }
  }
}

type CurrentUserProfile = {
  id: string
  email: string | null
  displayName: string | null
  accountRole: AccountRole
}

const SPECIAL_GUEST_EMAIL = 'specialguest@restoreswansea.local'

function fallbackAccountRole(email: string | null): AccountRole {
  return email === SPECIAL_GUEST_EMAIL ? 'guest' : 'member'
}

export async function getCurrentUserProfile(
  supabase: SupabaseServerClient,
  user: User
): Promise<CurrentUserProfile> {
  const fallbackRole = fallbackAccountRole(user.email ?? null)

  try {
    const { data } = await supabase
      .from('profiles')
      .select('id,email,display_name,global_role')
      .eq('id', user.id)
      .maybeSingle()

    const roleValue = typeof data?.global_role === 'string' ? data.global_role : null
    const accountRole = roleValue && isAccountRole(roleValue) ? roleValue : fallbackRole

    return {
      id: typeof data?.id === 'string' ? data.id : user.id,
      email: typeof data?.email === 'string' ? data.email : (user.email ?? null),
      displayName:
        typeof data?.display_name === 'string' ? data.display_name : null,
      accountRole,
    }
  } catch {
    return {
      id: user.id,
      email: user.email ?? null,
      displayName: null,
      accountRole: fallbackRole,
    }
  }
}
