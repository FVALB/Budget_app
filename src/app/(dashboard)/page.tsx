import { Suspense } from 'react'
import { getAccounts } from '@/server/db/accounts'
import { getTransactions } from '@/server/db/transactions'
import { getBudgets } from '@/server/db/budgets'
import { getCategories } from '@/server/db/categories'
import { getCashflowData } from '@/server/db/cashflow'
import { currentMonth, currentYear, monthLabel } from '@/lib/date'
import { AccountBalanceCard } from '@/features/dashboard/components/AccountBalanceCard'
import { SafeToSpendCard } from '@/features/cashflow/components/SafeToSpend'
import { ForecastChart } from '@/features/cashflow/components/ForecastChart'
import { UpcomingPayments } from '@/features/cashflow/components/UpcomingPayments'
import { BudgetOverview } from '@/features/dashboard/components/BudgetOverview'
import { RecentTransactions } from '@/features/dashboard/components/RecentTransactions'
import { SpendingTrendChart } from '@/features/dashboard/components/SpendingTrendChart'

export default async function DashboardPage() {
  const year = currentYear()
  const month = currentMonth()

  const [recentTxs, budgets, categories, cashflow] = await Promise.all([
    getTransactions({ include_transfers: false, limit: 10 }),
    getBudgets(year, month),
    getCategories(),
    getCashflowData().catch(() => null),
  ])

  const forecast = cashflow ?? {
    daily_forecast: [],
    recurring_payments: [],
    account_balances: [],
    total_balance_cents: 0,
    safe_to_spend_cents: 0,
    upcoming_total_cents: 0,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">{monthLabel(year, month)}</p>
      </div>

      {/* Row 1: Account balances + Safe to Spend */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {forecast.account_balances.map((acc) => (
          <AccountBalanceCard key={acc.id} account={acc} balance_cents={acc.balance_cents} />
        ))}
        <SafeToSpendCard
          safe_cents={forecast.safe_to_spend_cents}
          upcoming_cents={forecast.upcoming_total_cents}
        />
      </div>

      {/* Row 2: Forecast chart + Upcoming payments */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Suspense fallback={<div className="h-64 rounded-xl bg-muted animate-pulse" />}>
            <ForecastChart data={forecast.daily_forecast} year={year} month={month} />
          </Suspense>
        </div>
        <UpcomingPayments payments={forecast.recurring_payments} />
      </div>

      {/* Row 3: Budget overview */}
      <BudgetOverview budgets={budgets} categories={categories} year={year} month={month} />

      {/* Row 4: Spending trend + Recent transactions */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SpendingTrendChart year={year} month={month} />
        </div>
        <RecentTransactions transactions={recentTxs} />
      </div>
    </div>
  )
}
