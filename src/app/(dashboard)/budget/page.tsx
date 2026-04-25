import { getBudgets } from '@/server/db/budgets'
import { getCategories } from '@/server/db/categories'
import { getMonthlySpendingByCategory } from '@/server/db/transactions'
import { currentMonth, currentYear, monthLabel } from '@/lib/date'
import { BudgetClient } from './BudgetClient'

export default async function BudgetPage() {
  const year = currentYear()
  const month = currentMonth()

  const [budgets, categories, spending] = await Promise.all([
    getBudgets(year, month),
    getCategories(),
    getMonthlySpendingByCategory(year, month),
  ])

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Budget</h1>
        <p className="text-sm text-muted-foreground">{monthLabel(year, month)}</p>
      </div>

      <BudgetClient
        year={year}
        month={month}
        initialBudgets={budgets}
        categories={categories}
        spending={spending}
      />
    </div>
  )
}
