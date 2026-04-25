import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { monthStart, monthEnd, prevMonth } from '@/lib/date'
import { formatCents } from '@/lib/currency'
import { SpendingTrendChartClient } from './SpendingTrendChartClient'

interface Props {
  year: number
  month: number
}

interface MonthPoint {
  label: string
  spent_cents: number
  income_cents: number
}

export async function SpendingTrendChart({ year, month }: Props) {
  const supabase = await createClient()

  // Build last 6 months
  const months: { year: number; month: number }[] = []
  let y = year
  let m = month
  for (let i = 0; i < 6; i++) {
    months.unshift({ year: y, month: m })
    const prev = prevMonth(y, m)
    y = prev.year
    m = prev.month
  }

  const points: MonthPoint[] = await Promise.all(
    months.map(async ({ year: ry, month: rm }) => {
      const { data } = await supabase
        .from('transactions')
        .select('amount_cents')
        .eq('is_transfer', false)
        .gte('date', monthStart(ry, rm))
        .lte('date', monthEnd(ry, rm))

      const txs = data ?? []
      const spent = txs.filter((t) => t.amount_cents < 0).reduce((s, t) => s + Math.abs(t.amount_cents), 0)
      const income = txs.filter((t) => t.amount_cents > 0).reduce((s, t) => s + t.amount_cents, 0)

      return {
        label: new Date(ry, rm - 1, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        spent_cents: spent,
        income_cents: income,
      }
    })
  )

  const maxVal = Math.max(...points.map((p) => Math.max(p.spent_cents, p.income_cents)), 1)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">6-Month Spending Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <SpendingTrendChartClient points={points} maxVal={maxVal} formatCents={formatCents} />
      </CardContent>
    </Card>
  )
}
