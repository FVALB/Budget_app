import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCents } from '@/lib/currency'
import type { Account } from '@/types/app'
import { cn } from '@/lib/utils'

interface Props {
  account: Account
  balance_cents: number
}

const BANK_COLORS: Record<string, string> = {
  banque_populaire: 'bg-blue-600 text-white',
  revolut_personal: 'bg-emerald-600 text-white',
  revolut_joint:    'bg-amber-600 text-white',
}

function accountKey(account: Account): string {
  if (account.bank === 'banque_populaire') return 'banque_populaire'
  return account.account_type === 'joint' ? 'revolut_joint' : 'revolut_personal'
}

const BANK_LABELS: Record<string, string> = {
  banque_populaire: 'BP',
  revolut:          'Revolut',
}

export function AccountBalanceCard({ account, balance_cents }: Props) {
  const key = accountKey(account)
  const badgeClass = BANK_COLORS[key] ?? 'bg-muted text-muted-foreground'

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {account.name}
        </CardTitle>
        <Badge className={cn('text-xs', badgeClass)}>
          {BANK_LABELS[account.bank]}
        </Badge>
      </CardHeader>
      <CardContent>
        <p
          className={cn(
            'amount text-2xl font-bold',
            balance_cents >= 0 ? 'amount-positive' : 'amount-negative'
          )}
        >
          {formatCents(balance_cents)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground capitalize">{account.account_type}</p>
      </CardContent>
    </Card>
  )
}
