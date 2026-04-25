import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCents } from '@/lib/currency'
import { formatShortDate } from '@/lib/date'
import type { RecurringPayment } from '@/types/app'

interface Props {
  payments: RecurringPayment[]
}

export function UpcomingPayments({ payments }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Upcoming This Month</CardTitle>
        <p className="text-xs text-muted-foreground">Auto-detected recurring payments</p>
      </CardHeader>
      <CardContent>
        {payments.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No upcoming payments detected for the rest of this month.
          </p>
        ) : (
          <ul className="space-y-3">
            {payments.map((p, i) => (
              <li key={i} className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{p.payee}</p>
                  <p className="text-xs text-muted-foreground">
                    Expected {formatShortDate(p.expected_date)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="amount text-sm font-semibold amount-negative">
                    -{formatCents(p.expected_amount_cents)}
                  </span>
                  {p.confidence === 'auto' && (
                    <Badge variant="outline" className="text-xs h-4">auto</Badge>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
