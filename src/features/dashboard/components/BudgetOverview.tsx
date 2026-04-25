import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { formatCents } from '@/lib/currency'
import { getMonthlySpendingByCategory } from '@/server/db/transactions'
import { cn } from '@/lib/utils'
import type { Budget, Category } from '@/types/app'

interface Props {
  budgets: Budget[]
  categories: Category[]
  year: number
  month: number
}

export async function BudgetOverview({ budgets, categories, year, month }: Props) {
  const spending = await getMonthlySpendingByCategory(year, month)
  const spendingMap = new Map(spending.map((s) => [s.category_id, s.spent_cents]))

  // Only top-level categories with a budget > 0
  const budgetMap = new Map(budgets.map((b) => [b.category_id, b.amount_cents]))
  const topLevel = categories.filter((c) => !c.parent_id && budgetMap.has(c.id) && (budgetMap.get(c.id) ?? 0) > 0)

  if (topLevel.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Budget vs Actual</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No budgets set for this month.{' '}
            <a href="/budget" className="text-primary hover:underline">Set budgets →</a>
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Budget vs Actual</CardTitle>
        <p className="text-xs text-muted-foreground">Current month spending against targets</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {topLevel.map((cat) => {
            const budget = budgetMap.get(cat.id) ?? 0
            const spent = spendingMap.get(cat.id) ?? 0
            const pct = budget > 0 ? Math.min(Math.round((spent / budget) * 100), 100) : 0
            const over = spent > budget

            return (
              <div key={cat.id}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="font-medium">{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className={cn('amount font-semibold', over ? 'amount-negative' : '')}>
                      {formatCents(spent)}
                    </span>
                    <span>/ {formatCents(budget)}</span>
                    <span
                      className={cn(
                        'font-medium',
                        over ? 'text-[var(--budget-danger)]' : pct >= 80 ? 'text-[var(--budget-warning)]' : 'text-[var(--budget-success)]'
                      )}
                    >
                      {pct}%
                    </span>
                  </div>
                </div>
                <Progress
                  value={pct}
                  className={cn(
                    'h-2',
                    over
                      ? '[&>div]:bg-[var(--budget-danger)]'
                      : pct >= 80
                      ? '[&>div]:bg-[var(--budget-warning)]'
                      : '[&>div]:bg-[var(--budget-success)]'
                  )}
                />
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
