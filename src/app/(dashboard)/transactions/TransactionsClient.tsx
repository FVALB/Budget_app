'use client'

import { useState, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCents } from '@/lib/currency'
import { formatDisplayDate } from '@/lib/date'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Account, Category, Transaction } from '@/types/app'

interface Props {
  initialTransactions: Transaction[]
  accounts: Account[]
  categories: Category[]
}

export function TransactionsClient({ initialTransactions, accounts, categories }: Props) {
  const [transactions, setTransactions] = useState(initialTransactions)
  const [filterAccount, setFilterAccount] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [editingCategory, setEditingCategory] = useState<string | null>(null)

  const accountMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts])
  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])

  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      if (filterAccount !== 'all' && tx.account_id !== filterAccount) return false
      if (filterCategory === 'uncategorized' && tx.category_id) return false
      if (filterCategory !== 'all' && filterCategory !== 'uncategorized' && tx.category_id !== filterCategory) return false
      if (search && !tx.description.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [transactions, filterAccount, filterCategory, search])

  async function assignCategory(txId: string, category_id: string | null) {
    const res = await fetch('/api/transactions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: txId, category_id }),
    })
    if (!res.ok) { toast.error('Failed to update category'); return }

    setTransactions((prev) =>
      prev.map((tx) =>
        tx.id === txId
          ? { ...tx, category_id, category: category_id ? categoryMap.get(category_id) : undefined, reviewed: true }
          : tx
      )
    )
    setEditingCategory(null)
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search description…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 w-52 text-sm"
        />
        <Select value={filterAccount} onValueChange={(v) => { if (v) setFilterAccount(v) }}>
          <SelectTrigger className="h-8 w-44 text-sm">
            <SelectValue placeholder="All accounts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All accounts</SelectItem>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={(v) => { if (v) setFilterCategory(v) }}>
          <SelectTrigger className="h-8 w-44 text-sm">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            <SelectItem value="uncategorized">Uncategorized</SelectItem>
            {categories.filter((c) => !c.parent_id).map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} transactions</span>
      </div>

      <div className="rounded-xl border overflow-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="p-3 text-left font-medium text-muted-foreground">Date</th>
              <th className="p-3 text-left font-medium text-muted-foreground">Description</th>
              <th className="p-3 text-left font-medium text-muted-foreground">Account</th>
              <th className="p-3 text-left font-medium text-muted-foreground">Category</th>
              <th className="p-3 text-right font-medium text-muted-foreground">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  No transactions found.
                </td>
              </tr>
            )}
            {filtered.map((tx) => {
              const account = accountMap.get(tx.account_id)
              const category = tx.category_id ? categoryMap.get(tx.category_id) : null
              const isEditingThis = editingCategory === tx.id

              return (
                <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-3 whitespace-nowrap text-muted-foreground text-xs">
                    {formatDisplayDate(tx.date)}
                  </td>
                  <td className="p-3 max-w-xs">
                    <p className="truncate">{tx.description}</p>
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    {account && (
                      <Badge variant="outline" className="text-xs">{account.name}</Badge>
                    )}
                  </td>
                  <td className="p-3">
                    {isEditingThis ? (
                      <Select
                        value={tx.category_id ?? ''}
                        onValueChange={(v) => assignCategory(tx.id, v || null)}
                      >
                        <SelectTrigger className="h-6 w-36 text-xs">
                          <SelectValue placeholder="Pick category…" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">— None —</SelectItem>
                          {categories.filter((c) => !c.parent_id).map((parent) => (
                            <SelectItem key={parent.id} value={parent.id}>
                              {parent.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <button
                        className="flex items-center gap-1 group"
                        onClick={() => setEditingCategory(tx.id)}
                        title="Click to assign category"
                      >
                        {category ? (
                          <Badge
                            variant="outline"
                            className="text-xs group-hover:opacity-80"
                            style={{ borderColor: category.color, color: category.color }}
                          >
                            {category.name}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground group-hover:text-foreground">
                            {tx.reviewed ? '—' : 'uncategorized'}
                          </span>
                        )}
                      </button>
                    )}
                  </td>
                  <td className={cn(
                    'amount p-3 text-right font-semibold whitespace-nowrap',
                    tx.amount_cents > 0 ? 'amount-positive' : 'amount-negative'
                  )}>
                    {tx.amount_cents > 0 ? '+' : ''}{formatCents(tx.amount_cents)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
