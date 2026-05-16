'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

const allowedStatuses = [
  'not_started',
  'delivered',
  'needs_revisit',
  'no_residences',
] as const

type StreetStatus = (typeof allowedStatuses)[number]

function isStreetStatus(value: string): value is StreetStatus {
  return allowedStatuses.includes(value as StreetStatus)
}

export async function updateStreetAction(formData: FormData) {
  const supabase = await createClient()

  const streetId = String(formData.get('streetId') ?? '')
  const wardCode = String(formData.get('wardCode') ?? '')
  const status = String(formData.get('status') ?? '')
  const notes = String(formData.get('notes') ?? '')

  if (!streetId) {
    throw new Error('Missing street ID')
  }

  if (!wardCode) {
    throw new Error('Missing ward code')
  }

  if (!isStreetStatus(status)) {
    throw new Error(`Invalid street status: ${status}`)
  }

  const { error } = await supabase
    .from('streets')
    .update({
      status,
      notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', streetId)

  if (error) throw error

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { error: flyerTableError } = await supabase
    .from('flyer_logs')
    .select('id', { head: true })

  if (!flyerTableError) {
    await supabase.from('flyer_logs').insert({
      ward_code: wardCode,
      street_id: streetId,
      action: 'street_status_updated',
      user_id: user?.id ?? null,
    })
  }

  revalidatePath(`/dashboard/wards/${wardCode}`)
  revalidatePath('/dashboard')
}

export async function postWardMessageAction(formData: FormData) {
  const supabase = await createClient()

  const wardCode = String(formData.get('wardCode') ?? '')
  const message = String(formData.get('message') ?? '').trim()

  if (!wardCode) {
    throw new Error('Missing ward code')
  }

  if (!message) return

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return

  const { error } = await supabase.from('ward_messages').insert({
    ward_code: wardCode,
    user_id: user.id,
    message,
  })

  if (error) throw error

  revalidatePath(`/dashboard/wards/${wardCode}`)
}