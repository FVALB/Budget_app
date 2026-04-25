import { createClient } from '@/lib/supabase/server'
import type { Account } from '@/types/app'

export async function getAccounts(): Promise<Account[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('is_active', true)
    .order('created_at')
  if (error) throw error
  return data ?? []
}

export async function getAccount(id: string): Promise<Account | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return null
  return data
}

export async function createAccount(
  account: Omit<Account, 'id' | 'created_at'>
): Promise<Account> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('accounts')
    .insert(account)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateAccount(
  id: string,
  updates: Partial<Pick<Account, 'name' | 'is_active'>>
): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('accounts').update(updates).eq('id', id)
  if (error) throw error
}
