// Auto-detection of inter-account transfers based on known description patterns.
// Transfers are flagged as is_transfer=true and excluded from budget calculations.
// Users can un-flag false positives in the import review UI.

import type { RawTransaction } from './parsers/parser.types'

export type TransferRule = {
  pattern: RegExp
  label: string
}

// Rules derived from real BP and Revolut statement data
const TRANSFER_RULES: TransferRule[] = [
  // BP → Revolut Personal (card ending 8633)
  { pattern: /Revolut\*{0,2}8633/i,                label: 'BP → Revolut' },
  // BP → Revolut Joint (same pattern, card 0518 tops up both)
  { pattern: /Top-up\s+by\s+\*0518/i,              label: 'Revolut top-up from BP' },
  // BP → Joint account (instant transfer to Monica)
  { pattern: /VIR\s+INST\s+M[NI]CA\s+ROSAS/i,     label: 'BP → Joint account' },
  // Revolut Joint → Revolut Personal
  { pattern: /Transfer\s+from\s+CHRISTIAN\s+FELIPE/i, label: 'Joint → Revolut Personal' },
  // Transfer from Monica
  { pattern: /Transfer\s+from\s+MONICA\s+PATRICIA/i, label: 'Monica → Joint' },
  // Internal BP transfers (checking ↔ savings)
  { pattern: /Virement\s+vers\s+LIVRET\s+A/i,      label: 'BP → Livret A' },
  { pattern: /Virement\s+vers\s+COMPTE\s+CHEQUES/i, label: 'BP internal transfer' },
  // Virement de M VALENCIA BAQUERO (self-transfers inside BP)
  { pattern: /Virement\s+de\s+M\s+VALENCIA\s+BAQUERO/i, label: 'BP self-transfer' },
]

export function isTransfer(description: string): { transfer: boolean; label?: string } {
  for (const rule of TRANSFER_RULES) {
    if (rule.pattern.test(description)) {
      return { transfer: true, label: rule.label }
    }
  }
  return { transfer: false }
}

export function flagTransfers(
  transactions: RawTransaction[]
): Array<RawTransaction & { is_transfer: boolean; transfer_label?: string }> {
  return transactions.map((tx) => {
    const { transfer, label } = isTransfer(tx.description)
    return { ...tx, is_transfer: transfer, transfer_label: label }
  })
}
