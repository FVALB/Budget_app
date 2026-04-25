'use client'

import { useState } from 'react'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { formatCents } from '@/lib/currency'
import { toast } from 'sonner'
import type { Budget, Category } from '@/types/app'

interface Props {
  year: number
  month: number
  initialBudgets: Budget[]
  categories: Category[]
  spending: { category_id: string; spent_cents: number }[]
}

export function BudgetClient({ year, month, initialBudgets, categories, spending }: Props) {
  const [budgetMap, setBudgetMap] = useState<Map<string, number>>(
    new Map(initialBudgets.map((b) => [b.category_id, b.amount_cents]))
  )
  const [editing, setEditing] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [copying, setCopying] = useState(false)

  const spendingMap = new Map(spending.map((s) => [s.category_id, s.spent_cents]))
  const topLevel = categories.filter((c) => !c.parent_id)

  const totalBudget = Array.from(budgetMap.values()).reduce((s, v) => s + v, 0)
  const totalSpent = spending.reduce((s, b) => s + b.spent_cents, 0)

  async function saveBudget(category_id: string, euros: string) {
    const amount_cents = Math.round(parseFloat(euros) * 100)
    if (isNaN(amount_cents) || amount_cents < 0) {
      setEditing(null)
      return
    }
    const res = await fetch('/api/budgets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category_id, year, month, amount_cents }),
    })
    if (!res.ok) { toast.error('Failed to save budget'); return }
    setBudgetMap((prev) => new Map(prev).set(category_id, amount_cents))
    setEditing(null)
  }

  async function copyFromLastMonth() {
    setCopying(true)
    const res = await fetch('/api/budgets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'copy_from_last_month', year, month }),
    })
    setCopying(false)
    if (!res.ok) { toast.error('Failed to copy'); return }
    // Reload page to pick up the copied budgets
    window.location.reload()
  }

  function startEdit(cat: Category) {
    const current = budgetMap.get(cat.id) ?? 0
    setEditValue(current > 0 ? (current / 100).toFixed(2) : '')
    setEditing(cat.id)
  }

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Click any amount to edit the budget target.</p>
        <Button
          size="sm"
          variant="outline"
          onClick={copyFromLastMonth}
          disabled={copying}
          className="h-7 text-xs"
        >
          {copying ? 'Copying…' : 'Copy from last month'}
        </Button>
      </div>

      {/* Total summary */}
      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Total</span>
          <div className="flex gap-3 text-sm">
            <span className={cn('amount font-semibold', totalSpent > totalBudget && totalBudget > 0 ? 'amount-negative' : '')}>
              {formatCents(totalSpent)}
            </span>
            <span className="text-muted-foreground">/ {totalBudget > 0 ? formatCents(totalBudget) : '—'}</span>
          </div>
        </div>
        {totalBudget > 0 && (
          <Progress
            value={Math.min((totalSpent / totalBudget) * 100, 100)}
            className={cn(
              'h-2',
              totalSpent > totalBudget
                ? '[&>div]:bg-[var(--budget-danger)]'
                : (totalSpent / totalBudget) >= 0.8
                ? '[&>div]:bg-[var(--budget-warning)]'
                : '[&>div]:bg-[var(--budget-success)]'
            )}
          />
        )}
      </div>

      {/* Category list */}
      <div className="space-y-2">
        {topLevel.map((cat) => {
          const budget = budgetMap.get(cat.id) ?? 0
          const spent = spendingMap.get(cat.id) ?? 0
          const pct = budget > 0 ? (spent / budget) * 100 : 0
          const over = spent > budget && budget > 0
          const isEditing = editing === cat.id

          return (
            <div key={cat.id} className="rounded-xl border bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="font-medium text-sm">{cat.name}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className={cn('amount font-semibold', over ? 'amount-negative' : '')}>
                    {formatCents(spent)}
                  </span>
                  <span className="text-muted-foreground text-xs">/</span>
                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">€</span>
                      <Input
                        type="number"
                        min="0"
                        step="10"
                        className="h-6 w-24 text-xs py-0 px-1"
                        value={editValue}
                        autoFocus
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => saveBudget(cat.id, editValue)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveBudget(cat.id, editValue)
                          if (e.key === 'Escape') setEditing(null)
                        }}
                      />
                    </div>
                  ) : (
                    <button
                      className="text-xs text-muted-foreground hover:text-foreground hover:underline decoration-dotted"
                      onClick={() => startEdit(cat)}
                      title="Click to set budget"
                    >
                      {budget > 0 ? formatCents(budget) : 'set budget'}
                    </button>
                  )}
                </div>
              </div>
              {budget > 0 && (
                <Progress
                  value={Math.min(pct, 100)}
                  className={cn(
                    'h-1.5',
                    over ? '[&>div]:bg-[var(--budget-danger)]' :
                    pct >= 80 ? '[&>div]:bg-[var(--budget-warning)]' :
                    '[&>div]:bg-[var(--budget-success)]'
                  )}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
