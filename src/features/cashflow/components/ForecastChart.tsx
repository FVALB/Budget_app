'use client'

import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCents } from '@/lib/currency'
import { today, formatShortDate } from '@/lib/date'

interface DayData {
  date: string
  balance_cents: number
  is_projected: boolean
}

interface Props {
  data: DayData[]
  year: number
  month: number
  threshold_cents?: number
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ value: number; payload: DayData }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border bg-card p-3 shadow-sm text-sm">
      <p className="font-medium">{label ? formatShortDate(label) : ''}</p>
      <p className={`amount font-semibold ${d.balance_cents >= 0 ? 'amount-positive' : 'amount-negative'}`}>
        {formatCents(d.balance_cents)}
      </p>
      {d.is_projected && (
        <p className="text-xs text-muted-foreground">Projected</p>
      )}
    </div>
  )
}

export function ForecastChart({ data, threshold_cents = 30000 }: Props) {
  const todayStr = today()

  const actualData = data.filter((d) => !d.is_projected)
  const projectedData = data.filter((d) => d.is_projected)

  const minBalance = Math.min(...data.map((d) => d.balance_cents), threshold_cents)
  const maxBalance = Math.max(...data.map((d) => d.balance_cents))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Monthly Cashflow Forecast</CardTitle>
        <p className="text-xs text-muted-foreground">
          Solid = actual · Dashed = projected · Red line = safety threshold (
          {formatCents(threshold_cents)})
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              tickFormatter={(d) => new Date(d + 'T00:00:00').getDate().toString()}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => `${Math.round(v / 100)}€`}
              domain={[Math.min(0, minBalance - 5000), maxBalance + 5000]}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Safety threshold reference line */}
            <ReferenceLine
              y={threshold_cents}
              stroke="var(--budget-danger)"
              strokeDasharray="4 4"
              label={{ value: 'Safety', position: 'right', fontSize: 10 }}
            />

            {/* Today reference line */}
            <ReferenceLine
              x={todayStr}
              stroke="var(--forecast-actual)"
              strokeDasharray="3 3"
              label={{ value: 'Today', position: 'insideTopRight', fontSize: 10 }}
            />

            {/* Actual balance area */}
            <Area
              data={actualData}
              type="monotone"
              dataKey="balance_cents"
              stroke="var(--forecast-actual)"
              fill="var(--forecast-actual)"
              fillOpacity={0.15}
              strokeWidth={2}
              dot={false}
              connectNulls
            />

            {/* Projected balance line (dashed) */}
            <Line
              data={projectedData}
              type="monotone"
              dataKey="balance_cents"
              stroke="var(--forecast-projected)"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
