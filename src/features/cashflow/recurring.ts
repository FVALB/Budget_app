// Recurring payment detection
// Groups past transactions by normalized payee, identifies monthly patterns,
// and predicts upcoming payments for the rest of the current month.

import Fuse from 'fuse.js'
import { dayOfMonth, monthDays, today } from '@/lib/date'
import type { RecurringPayment, Transaction } from '@/types/app'

// Normalize a payee description for grouping
function normalizePayee(description: string): string {
  return description
    .toUpperCase()
    .replace(/\*{2,}/g, ' ')          // ** → space
    .replace(/[^A-Z0-9\s]/g, ' ')     // remove special chars
    .replace(/\s+/g, ' ')             // collapse spaces
    .trim()
    .slice(0, 40)                     // cap length
}

// Group transactions by similar payee using fuzzy matching
function groupByPayee(transactions: Transaction[]): Map<string, Transaction[]> {
  const groups = new Map<string, { canonical: string; transactions: Transaction[] }>()

  for (const tx of transactions) {
    const payee = normalizePayee(tx.description)
    if (!payee) continue

    let matched = false
    const candidates = Array.from(groups.values()).map((g) => ({ name: g.canonical }))

    if (candidates.length > 0) {
      const fuse = new Fuse(candidates, { keys: ['name'], threshold: 0.25 })
      const results = fuse.search(payee)
      if (results.length > 0) {
        const canonical = results[0].item.name
        groups.get(canonical)?.transactions.push(tx)
        matched = true
      }
    }

    if (!matched) {
      groups.set(payee, { canonical: payee, transactions: [tx] })
    }
  }

  const result = new Map<string, Transaction[]>()
  for (const [key, val] of groups.entries()) {
    result.set(key, val.transactions)
  }
  return result
}

// Check if a group of transactions is recurring (≥2 occurrences, monthly cadence)
function isRecurring(txs: Transaction[]): boolean {
  if (txs.length < 2) return false

  const sortedByDate = [...txs].sort((a, b) => a.date.localeCompare(b.date))
  const amounts = txs.map((t) => Math.abs(t.amount_cents))
  const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length

  // Amount variance check: all amounts within ±15% of average
  const withinRange = amounts.every((a) => Math.abs(a - avgAmount) / avgAmount <= 0.15)
  if (!withinRange) return false

  // Day-of-month variance: compare day of most recent occurrences
  const days = sortedByDate.map((t) => dayOfMonth(t.date))
  const avgDay = days.reduce((a, b) => a + b, 0) / days.length
  const dayVariance = days.every((d) => Math.abs(d - avgDay) <= 7)
  if (!dayVariance) return false

  // At least 2 occurrences in different months
  const months = new Set(sortedByDate.map((t) => t.date.slice(0, 7)))
  return months.size >= 2
}

export function detectRecurringPayments(
  transactions: Transaction[],
  year: number,
  month: number
): RecurringPayment[] {
  const todayStr = today()

  // Only look at debits (expenses), not transfers
  const debits = transactions.filter((t) => t.amount_cents < 0 && !t.is_transfer)
  const groups = groupByPayee(debits)

  const recurring: RecurringPayment[] = []

  for (const [payee, txs] of groups.entries()) {
    if (!isRecurring(txs)) continue

    const sorted = [...txs].sort((a, b) => b.date.localeCompare(a.date))
    const lastTx = sorted[0]
    const lastDay = dayOfMonth(lastTx.date)

    // Predict next occurrence: same day next month (clamp to month end)
    const daysArr = monthDays(year, month)
    const predictedDay = Math.min(lastDay, daysArr.length)
    const expectedDate = daysArr[predictedDay - 1]

    // Only include if expected date is in the future (rest of current month)
    if (expectedDate <= todayStr) continue

    const avgAmount = Math.round(
      txs.reduce((sum, t) => sum + Math.abs(t.amount_cents), 0) / txs.length
    )

    recurring.push({
      payee,
      expected_amount_cents: avgAmount,
      expected_date: expectedDate,
      account_id: lastTx.account_id,
      confidence: 'auto',
      last_seen_date: lastTx.date,
    })
  }

  // Sort by expected date ascending
  return recurring.sort((a, b) => a.expected_date.localeCompare(b.expected_date))
}

// Compute projected daily balances for the rest of the month
// combining actual transactions (past) with recurring estimates (future)
export function buildDailyForecast(
  actualTransactions: Transaction[],
  recurringPayments: RecurringPayment[],
  openingBalance: number, // total balance at start of month in cents
  year: number,
  month: number
): Array<{ date: string; balance_cents: number; is_projected: boolean }> {
  const todayStr = today()
  const days = monthDays(year, month)

  // Map of date → net amount from actual transactions
  const actualByDate = new Map<string, number>()
  for (const tx of actualTransactions) {
    actualByDate.set(tx.date, (actualByDate.get(tx.date) ?? 0) + tx.amount_cents)
  }

  // Map of date → projected debit from recurring payments
  const projectedByDate = new Map<string, number>()
  for (const rp of recurringPayments) {
    projectedByDate.set(
      rp.expected_date,
      (projectedByDate.get(rp.expected_date) ?? 0) - rp.expected_amount_cents
    )
  }

  let runningBalance = openingBalance
  const result = []

  for (const date of days) {
    const isProjected = date > todayStr
    if (!isProjected) {
      runningBalance += actualByDate.get(date) ?? 0
    } else {
      runningBalance += projectedByDate.get(date) ?? 0
    }
    result.push({ date, balance_cents: runningBalance, is_projected: isProjected })
  }

  return result
}
