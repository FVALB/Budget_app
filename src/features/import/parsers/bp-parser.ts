// Banque Populaire PDF parser
// Format: "Extrait de compte - XXXXXXXX - YYYYMMDD.pdf"
// Date column: DD/MM (year extracted from statement period header)
// Amount: European format — 1.103,90 € (period=thousands, comma=decimal)

import type { ParserResult, RawTransaction } from './parser.types'

// Parse European amount string → cents
// "-1.103,90 €"  →  -110390
// "972,00 €"     →  97200
function parseEuroAmount(raw: string): number | null {
  const cleaned = raw.trim().replace(/\s/g, '')
  // Remove currency symbol and trailing characters
  const stripped = cleaned.replace(/[€\s]/g, '').replace(/[^-\d,.]/g, '')
  if (!stripped) return null

  const negative = stripped.startsWith('-')
  const abs = stripped.replace(/^-/, '')
  // Remove thousands separators (periods), replace decimal comma with period
  const normalized = abs.replace(/\./g, '').replace(',', '.')
  const euros = parseFloat(normalized)
  if (isNaN(euros)) return null
  return Math.round((negative ? -euros : euros) * 100)
}

// Extract the statement year from header: "du 05/11/2025 au 05/12/2025"
function extractYear(text: string): number {
  const m = text.match(/\d{2}\/\d{2}\/(\d{4})/)
  if (m) return parseInt(m[1], 10)
  return new Date().getFullYear()
}

// Convert DD/MM + year to ISO date
function toISO(ddmm: string, year: number): string {
  const [dd, mm] = ddmm.split('/')
  return `${year}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
}

// Detect month rollover: if the month we're parsing is less than the previous
// month (e.g. going from 11 to 12 then 01), increment the year.
function resolveYear(month: number, prevMonth: number, year: number): number {
  if (prevMonth > 0 && month < prevMonth && prevMonth === 12) return year + 1
  return year
}

export function parseBanquePopulairePDF(text: string): ParserResult {
  const warnings: string[] = []
  const transactions: RawTransaction[] = []

  // Extract the base year from statement period
  let year = extractYear(text)
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)

  // The transaction table starts after "DATE COMPTA" header
  // Each transaction line format (from real PDFs):
  //   DD/MM   <description tokens>   DD/MM   DD/MM   -1.103,90 €
  //   DD/MM   <description tokens>           972,00 €
  //
  // We match lines that START with a DD/MM date pattern and END with an amount.
  // The amount is at the END of the line, optionally preceded by more date tokens.

  const txLineRe = /^(\d{2}\/\d{2})\s+(.+?)\s+([-]?\d[\d.,]*)\s*€\s*$/

  // Also capture intermediate balance lines to skip them
  const interBalanceRe = /solde\s+interm[eé]diaire/i
  const sectionHeaderRe = /^DATE\s+(COMPTA|OPERATION|VALEUR)/i
  const sepaDetailRe = /^(Créancier|Crédit|Référence|Mandat|Libellé)\s*:/i

  let prevMonth = 0

  for (const line of lines) {
    if (interBalanceRe.test(line)) continue
    if (sectionHeaderRe.test(line)) continue
    if (sepaDetailRe.test(line)) continue

    const m = txLineRe.exec(line)
    if (!m) continue

    const dateStr = m[1]   // DD/MM
    const rawAmount = m[3]

    const month = parseInt(dateStr.split('/')[1], 10)
    year = resolveYear(month, prevMonth, year)
    prevMonth = month

    const isoDate = toISO(dateStr, year)
    const amount_cents = parseEuroAmount(rawAmount)
    if (amount_cents === null) {
      warnings.push(`Could not parse amount: "${rawAmount}" on line: "${line}"`)
      continue
    }

    // Description: everything between the first DD/MM and the last amount token
    // Strip trailing date tokens (DD/MM patterns at end before the amount)
    let description = m[2].replace(/\s+\d{2}\/\d{2}\s+\d{2}\/\d{2}\s*$/, '').trim()
    description = description.replace(/\s+\d{2}\/\d{2}\s*$/, '').trim()
    if (!description) description = m[2].trim()

    transactions.push({ date: isoDate, description, amount_cents })
  }

  if (transactions.length === 0) {
    warnings.push(
      'No transactions extracted. The PDF layout may differ from expected — please check the raw text.'
    )
  }

  return { transactions, warnings }
}
