import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCents } from '@/lib/currency'
import { formatShortDate } from '@/lib/date'
import { cn } from '@/lib/utils'
import type { Transaction } from '@/types/app'
import Link from 'next/link'

interface Props {
  transactions: Transaction[]
}

export function RecentTransactions({ transactions }: Props) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Recent Transactions</CardTitle>
        <Link href="/transactions" className="text-xs text-primary hover:underline">
          View all →
        </Link>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No transactions yet. <a href="/import" className="text-primary hover:underline">Import your first statement →</a>
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {transactions.slice(0, 10).map((tx) => (
              <li key={tx.id} className="flex items-center justify-between py-3 gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{tx.description}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">{formatShortDate(tx.date)}</span>
                    {tx.category && (
                      <Badge
                        variant="outline"
                        className="h-4 text-xs px-1.5"
                        style={{ borderColor: tx.category.color, color: tx.category.color }}
                      >
                        {tx.category.name}
                      </Badge>
                    )}
                    {!tx.reviewed && (
                      <Badge variant="outline" className="h-4 text-xs px-1.5 text-muted-foreground">
                        uncategorized
                      </Badge>
                    )}
                  </div>
                </div>
                <span
                  className={cn(
                    'amount text-sm font-semibold shrink-0',
                    tx.amount_cents > 0 ? 'amount-positive' : 'amount-negative'
                  )}
                >
                  {tx.amount_cents > 0 ? '+' : ''}{formatCents(tx.amount_cents)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
