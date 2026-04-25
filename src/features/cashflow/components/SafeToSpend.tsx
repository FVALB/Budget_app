import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCents } from '@/lib/currency'
import { cn } from '@/lib/utils'

interface Props {
  safe_cents: number
  upcoming_cents: number
  threshold_cents?: number
}

export function SafeToSpendCard({ safe_cents, upcoming_cents, threshold_cents = 30000 }: Props) {
  const isSafe = safe_cents > threshold_cents
  const isWarning = safe_cents > 0 && safe_cents <= threshold_cents

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Safe to Spend
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p
          className={cn(
            'amount text-2xl font-bold',
            isSafe ? 'amount-positive' : isWarning ? 'text-[var(--budget-warning)]' : 'amount-negative'
          )}
        >
          {formatCents(safe_cents)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          After {formatCents(upcoming_cents)} in upcoming payments
        </p>
      </CardContent>
    </Card>
  )
}
