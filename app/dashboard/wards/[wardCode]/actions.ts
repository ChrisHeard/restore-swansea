'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireCampaignWriteAccess } from '@/lib/domain/permissions'
import { isStreetStatus } from '@/lib/domain/street-status'

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

  const { user } = await requireCampaignWriteAccess(supabase, wardCode)

  const { data: street, error: streetError } = await supabase
    .from('streets')
    .select('id,ward_code')
    .eq('id', streetId)
    .maybeSingle()

  if (streetError) throw streetError

  if (!street || street.ward_code !== wardCode) {
    throw new Error('Street does not belong to this ward')
  }

  const { error } = await supabase
    .from('streets')
    .update({
      status,
      notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', streetId)
    .eq('ward_code', wardCode)

  if (error) throw error

  const { error: flyerTableError } = await supabase
    .from('flyer_logs')
    .select('id', { head: true })

  if (!flyerTableError) {
    await supabase.from('flyer_logs').insert({
      ward_code: wardCode,
      street_id: streetId,
      action: 'street_status_updated',
      user_id: user.id,
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

  const { user } = await requireCampaignWriteAccess(supabase, wardCode)

  const { error } = await supabase.from('ward_messages').insert({
    ward_code: wardCode,
    user_id: user.id,
    message,
  })

  if (error) throw error

  revalidatePath(`/dashboard/wards/${wardCode}`)
}
