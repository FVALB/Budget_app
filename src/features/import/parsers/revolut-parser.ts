// Revolut PDF parser (Personal and Joint accounts use the same format)
// Date format: "Dec 1, 2025"
// Amount format: English — 2,685.93 (comma=thousands, period=decimal)
// Columns: Date | Description | Money out | Money in | Balance

import type { ParserResult, RawTransaction } from './parser.types'

const MONTH_MAP: Record<string, string> = {
  Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
  Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
}

// Parse English amount string → cents
// "2,685.93" → 268593    "16.99" → 1699
function parseEnglishAmount(raw: string): number | null {
  const cleaned = raw.trim().replace(/,/g, '').replace(/[^0-9.]/g, '')
  if (!cleaned) return null
  const val = parseFloat(cleaned)
  if (isNaN(val)) return null
  return Math.round(val * 100)
}

// Parse "Dec 1, 2025" → "2025-12-01"
function parseRevolutDate(raw: string): string | null {
  const m = raw.match(/^([A-Z][a-z]{2})\s+(\d{1,2}),\s+(\d{4})$/)
  if (!m) return null
  const month = MONTH_MAP[m[1]]
  if (!month) return null
  return `${m[3]}-${month}-${m[2].padStart(2, '0')}`
}

export function parseRevolutPDF(text: string): ParserResult {
  const warnings: string[] = []
  const transactions: RawTransaction[] = []

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)

  // State machine: collect lines between "Transactions" and "Pending Transactions"
  // or end of page markers
  let inTransactions = false
  let skipPending = false

  // Revolut transaction line: starts with a date like "Dec 1, 2025"
  // Followed by description, then 1-2 amounts (money out / money in), then running balance
  // We'll accumulate date + description on one line, amounts on the next few
  // Simplification: parse line by line looking for date-prefixed rows

  // Pattern: line starts with month abbreviation
  const datePrefixRe = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},\s+\d{4}/

  // Amount-only line (for multi-line entries)
  const amountOnlyRe = /^[\d,]+\.\d{2}$/

  let i = 0
  while (i < lines.length) {
    const line = lines[i]

    // Enter transaction section
    if (/^Transactions$/i.test(line)) { inTransactions = true; i++; continue }
    if (/^Pending\s+Transactions?/i.test(line)) { skipPending = true; i++; continue }
    if (/^Personal\s+and\s+Group\s+Pockets/i.test(line)) { inTransactions = false; i++; continue }
    if (/^Page\s+\d+\s+of\s+\d+/i.test(line)) { i++; continue }
    // Skip forex rate lines
    if (/Revolut\s+Rate|ECB\s+rate/i.test(line)) { i++; continue }

    if (!inTransactions || skipPending) { i++; continue }

    // Try to match a transaction line starting with a date
    if (!datePrefixRe.test(line)) { i++; continue }

    // Extract date portion
    const dateMatch = line.match(/^([A-Z][a-z]{2}\s+\d{1,2},\s+\d{4})/)
    if (!dateMatch) { i++; continue }

    const isoDate = parseRevolutDate(dateMatch[1])
    if (!isoDate) { i++; continue }

    // Rest of line after date
    const rest = line.slice(dateMatch[0].length).trim()

    // Split remaining tokens — amounts are at the end (right-aligned in PDF → appear last in text)
    // Token pattern: description words, then 0-3 numeric tokens at end
    const tokens = rest.split(/\s+/)

    // Find where amounts start: tokens from the right that match amount pattern
    const amountRe = /^[\d,]+\.\d{2}$/
    let amountStart = tokens.length
    while (amountStart > 1 && amountRe.test(tokens[amountStart - 1])) {
      amountStart--
    }

    const descTokens = tokens.slice(0, amountStart)
    const amountTokens = tokens.slice(amountStart)

    let description = descTokens.join(' ').trim()
    if (!description) description = '(no description)'

    // amountTokens: could be [money_out, balance] or [money_in, balance]
    // or [money_out, money_in, balance] if both present
    // The last token is always the running balance — ignore it
    // The token(s) before it are money_out and/or money_in

    // Look ahead: next line may be continuation (for multi-line descriptions)
    // Check if next line is a date-prefixed line or amount-only
    let moneyOut: number | null = null
    let moneyIn: number | null = null

    // Determine from context: on the same line look for column positions
    // Since PDF text strips layout, we use a heuristic:
    // If 1 amount token (besides balance): check if this transaction is a debit or credit
    // For Revolut: money_out column comes before money_in column
    // We rely on the order: if there are 2 amounts, first = out, second = in (both non-zero)
    // If only 1: use sign heuristic — "Top-up" transactions are credits

    if (amountTokens.length >= 2) {
      // Last token = balance, preceding = out/in amounts
      const moneyTokens = amountTokens.slice(0, -1) // remove balance
      if (moneyTokens.length === 2) {
        moneyOut = parseEnglishAmount(moneyTokens[0])
        moneyIn  = parseEnglishAmount(moneyTokens[1])
      } else if (moneyTokens.length === 1) {
        // Determine if it's out or in based on description heuristics
        const isIncoming = /top.up|transfer from|received|refund/i.test(description)
        if (isIncoming) {
          moneyIn  = parseEnglishAmount(moneyTokens[0])
        } else {
          moneyOut = parseEnglishAmount(moneyTokens[0])
        }
      }
    }

    if (moneyOut === null && moneyIn === null) {
      warnings.push(`Could not determine amounts for: "${line}"`)
      i++
      continue
    }

    // Debit (money out) = negative, credit (money in) = positive
    let amount_cents = 0
    if (moneyOut !== null && moneyOut > 0) amount_cents -= moneyOut
    if (moneyIn  !== null && moneyIn  > 0) amount_cents += moneyIn

    if (amount_cents === 0) {
      warnings.push(`Zero amount transaction skipped: "${line}"`)
      i++
      continue
    }

    transactions.push({ date: isoDate, description, amount_cents })
    i++
  }

  if (transactions.length === 0) {
    warnings.push(
      'No transactions extracted from Revolut PDF. Layout may differ — check raw text.'
    )
  }

  return { transactions, warnings }
}
