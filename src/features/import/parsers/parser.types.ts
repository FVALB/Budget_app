export interface RawTransaction {
  date: string        // ISO YYYY-MM-DD
  description: string
  amount_cents: number // negative = debit, positive = credit
}

export interface ParserResult {
  transactions: RawTransaction[]
  statement_period?: { from: string; to: string }
  account_holder?: string
  warnings: string[]
}
