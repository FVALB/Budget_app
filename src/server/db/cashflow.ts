import { createClient } from '@/lib/supabase/server'
import { getAccounts } from './accounts'
import { getTransactions } from './transactions'
import { detectRecurringPayments, buildDailyForecast } from '@/features/cashflow/recurring'
import { currentMonth, currentYear, monthStart, prevMonth } from '@/lib/date'
import type { Account, DailyBalance, RecurringPayment } from '@/types/app'

export interface AccountWithBalance extends Account {
  balance_cents: number
}

export interface CashflowData {
  daily_forecast: DailyBalance[]
  recurring_payments: RecurringPayment[]
  account_balances: AccountWithBalance[]
  total_balance_cents: number
  safe_to_spend_cents: number
  upcoming_total_cents: number
}

export async function getCashflowData(): Promise<CashflowData> {
  const supabase = await createClient()
  const year = currentYear()
  const month = currentMonth()
  const prev = prevMonth(year, month)
  const prev2 = prevMonth(prev.year, prev.month)

  const [accounts, currentMonthTxs] = await Promise.all([
    getAccounts(),
    getTransactions({ year, month, include_transfers: false }),
  ])

  // Last 3 months of data for recurring detection
  const { data: historicalData } = await supabase
    .from('transactions')
    .select('*')
    .eq('is_transfer', false)
    .gte('date', monthStart(prev2.year, prev2.month))
    .order('date', { ascending: false })
  const historicalTxs = historicalData ?? []

  const recurring = detectRecurringPayments(
    historicalTxs as Parameters<typeof detectRecurringPayments>[0],
    year,
    month
  )

  // Total balance = sum of all non-transfer transactions across all accounts
  const accountIds = accounts.map((a) => a.id)
  const { data: allTxs } = await supabase
    .from('transactions')
    .select('amount_cents, account_id')
    .in('account_id', accountIds)
    .eq('is_transfer', false)

  const totalBalance = (allTxs ?? []).reduce((sum, t) => sum + t.amount_cents, 0)

  const currentMonthNet = currentMonthTxs.reduce((sum, t) => sum + t.amount_cents, 0)
  const openingBalance = totalBalance - currentMonthNet

  const accountBalances: AccountWithBalance[] = accounts.map((acc) => {
    const balance = (allTxs ?? [])
      .filter((t) => t.account_id === acc.id)
      .reduce((sum, t) => sum + t.amount_cents, 0)
    return { ...acc, balance_cents: balance }
  })

  const dailyForecast = buildDailyForecast(currentMonthTxs, recurring, openingBalance, year, month)
  const upcomingTotal = recurring.reduce((sum, r) => sum + r.expected_amount_cents, 0)
  const safeToSpend = totalBalance - upcomingTotal

  return {
    daily_forecast: dailyForecast,
    recurring_payments: recurring,
    account_balances: accountBalances,
    total_balance_cents: totalBalance,
    safe_to_spend_cents: safeToSpend,
    upcoming_total_cents: upcomingTotal,
  }
}
