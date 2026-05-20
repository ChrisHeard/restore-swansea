'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function updateDisplayNameAction(formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const displayName = String(formData.get('displayName') ?? '').trim()
  const avatarUrl = String(formData.get('avatarUrl') ?? '').trim()

  const { error } = await supabase.from('profiles').upsert({
    user_id: user.id,
    email: user.email,
    display_name: displayName || null,
    avatar_url: avatarUrl || null,
    updated_at: new Date().toISOString(),
  })

  if (error) throw error

  revalidatePath('/account')
}

export async function updatePasswordAction(formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const password = String(formData.get('password') ?? '')

  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters.')
  }

  const { error } = await supabase.auth.updateUser({
    password,
  })

  if (error) throw error

  revalidatePath('/account')
}

export async function requestWardLeadershipAction(formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const wardCode = String(formData.get('wardCode') ?? '').trim()
  const reason = String(formData.get('reason') ?? '').trim()

  if (!wardCode) {
    throw new Error('Ward is required.')
  }

  const { error } = await supabase.from('ward_leadership_requests').insert({
    user_id: user.id,
    ward_code: wardCode,
    reason: reason || null,
  })

  if (error) throw error

  revalidatePath('/account')
}