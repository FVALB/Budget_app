'use client'

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface MonthPoint {
  label: string
  spent_cents: number
  income_cents: number
}

interface Props {
  points: MonthPoint[]
  maxVal: number
  formatCents: (cents: number) => string
}

export function SpendingTrendChartClient({ points, formatCents }: Props) {
  const data = points.map((p) => ({
    label: p.label,
    Spending: p.spent_cents / 100,
    Income: p.income_cents / 100,
  }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <ComposedChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `€${Math.round(v)}`}
          width={55}
        />
        <Tooltip
          formatter={(value, name) => {
            const num = typeof value === 'number' ? value : 0
            return [formatCents(Math.round(num * 100)), String(name)]
          }}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="Spending" fill="var(--budget-danger)" radius={[3, 3, 0, 0]} opacity={0.85} />
        <Line
          type="monotone"
          dataKey="Income"
          stroke="var(--budget-success)"
          strokeWidth={2}
          dot={{ r: 3, fill: 'var(--budget-success)' }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
