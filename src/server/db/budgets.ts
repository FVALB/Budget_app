import { createClient } from '@/lib/supabase/server'
import type { Budget } from '@/types/app'
import { currentMonth, currentYear, prevMonth } from '@/lib/date'

export async function getBudgets(year?: number, month?: number): Promise<Budget[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('budgets')
    .select('*')
    .eq('year', year ?? currentYear())
    .eq('month', month ?? currentMonth())
  if (error) throw error
  return data ?? []
}

export async function upsertBudget(budget: Omit<Budget, 'id'>): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('budgets').upsert(budget, {
    onConflict: 'household_id,category_id,year,month',
  })
  if (error) throw error
}

// Copy last month's budgets to the current month (skip if already set)
export async function copyBudgetsFromLastMonth(
  household_id: string,
  year: number,
  month: number
): Promise<void> {
  const prev = prevMonth(year, month)
  const supabase = await createClient()
  const { data: lastMonth, error } = await supabase
    .from('budgets')
    .select('*')
    .eq('household_id', household_id)
    .eq('year', prev.year)
    .eq('month', prev.month)
  if (error) throw error

  const newBudgets = (lastMonth ?? []).map((b) => ({
    household_id,
    category_id: b.category_id,
    year,
    month,
    amount_cents: b.amount_cents,
  }))

  if (newBudgets.length === 0) return

  const { error: insertError } = await supabase.from('budgets').upsert(newBudgets, {
    onConflict: 'household_id,category_id,year,month',
    ignoreDuplicates: true,
  })
  if (insertError) throw insertError
}
