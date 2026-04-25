import { createClient } from '@/lib/supabase/server'
import type { Household } from '@/types/app'

export async function getHousehold(): Promise<Household | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const household_id = user.user_metadata?.household_id
  if (!household_id) return null

  const { data, error } = await supabase
    .from('households')
    .select('*')
    .eq('id', household_id)
    .single()

  if (error) return null
  return data
}

export async function updateHousehold(
  updates: Partial<Pick<Household, 'name' | 'safety_threshold_cents'>>
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')

  const household_id = user.user_metadata?.household_id
  const { error } = await supabase
    .from('households')
    .update(updates)
    .eq('id', household_id)

  if (error) throw error
}
