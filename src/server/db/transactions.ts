import { createClient } from '@/lib/supabase/server'
import { currentMonth, currentYear, monthEnd, monthStart } from '@/lib/date'
import type { Transaction } from '@/types/app'

export async function getTransactions(filters?: {
  account_id?: string
  category_id?: string
  include_transfers?: boolean
  year?: number
  month?: number
  limit?: number
}): Promise<Transaction[]> {
  const supabase = await createClient()
  let query = supabase
    .from('transactions')
    .select('*, account:accounts(id,name,bank,account_type), category:categories(id,name,color,parent_id)')
    .order('date', { ascending: false })

  if (filters?.account_id) query = query.eq('account_id', filters.account_id)
  if (filters?.category_id) query = query.eq('category_id', filters.category_id)
  if (filters?.include_transfers === false) query = query.eq('is_transfer', false)

  if (filters?.year && filters?.month) {
    query = query
      .gte('date', monthStart(filters.year, filters.month))
      .lte('date', monthEnd(filters.year, filters.month))
  }

  if (filters?.limit) query = query.limit(filters.limit)

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function getMonthlySpendingByCategory(year?: number, month?: number): Promise<
  { category_id: string; spent_cents: number }[]
> {
  const y = year ?? currentYear()
  const m = month ?? currentMonth()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('transactions')
    .select('category_id, amount_cents')
    .eq('is_transfer', false)
    .lt('amount_cents', 0)
    .gte('date', monthStart(y, m))
    .lte('date', monthEnd(y, m))

  if (error) throw error

  // Aggregate by category_id
  const map = new Map<string, number>()
  for (const t of data ?? []) {
    if (!t.category_id) continue
    map.set(t.category_id, (map.get(t.category_id) ?? 0) + Math.abs(t.amount_cents))
  }
  return Array.from(map.entries()).map(([category_id, spent_cents]) => ({
    category_id,
    spent_cents,
  }))
}

export async function getDailyBalances(
  accountIds: string[],
  year: number,
  month: number
): Promise<{ date: string; amount_cents: number; account_id: string }[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('transactions')
    .select('date, amount_cents, account_id')
    .in('account_id', accountIds)
    .gte('date', monthStart(year, month))
    .lte('date', monthEnd(year, month))
    .order('date', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function getImportHashes(accountId: string): Promise<Set<string>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('transactions')
    .select('import_hash')
    .eq('account_id', accountId)

  if (error) throw error
  return new Set((data ?? []).map((r) => r.import_hash))
}

export async function insertTransactions(
  rows: Omit<Transaction, 'id' | 'created_at'>[]
): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('transactions').insert(rows)
  if (error) throw error
}

export async function updateTransactionCategory(
  id: string,
  category_id: string | null
): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('transactions')
    .update({ category_id, reviewed: true })
    .eq('id', id)
  if (error) throw error
}
