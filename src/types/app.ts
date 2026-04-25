// Core domain types used across the app

export type Bank = 'banque_populaire' | 'revolut'
export type AccountType = 'checking' | 'personal' | 'joint'
export type ImportStatus = 'success' | 'error' | 'duplicate_file'

export interface Household {
  id: string
  name: string
  safety_threshold_cents: number
  created_at: string
}

export interface Account {
  id: string
  household_id: string
  name: string
  bank: Bank
  account_type: AccountType
  currency: string
  is_active: boolean
  created_at: string
}

export interface Category {
  id: string
  household_id: string
  name: string
  parent_id: string | null
  color: string
  icon: string | null
  sort_order: number
  created_at: string
  children?: Category[]
}

export interface Budget {
  id: string
  household_id: string
  category_id: string
  year: number
  month: number
  amount_cents: number
}

export interface Transaction {
  id: string
  household_id: string
  account_id: string
  date: string
  description: string
  amount_cents: number
  category_id: string | null
  is_transfer: boolean
  transfer_pair: string | null
  import_hash: string
  reviewed: boolean
  created_at: string
  // joined fields
  account?: Account
  category?: Category
}

export interface ImportLog {
  id: string
  household_id: string
  account_id: string
  filename: string
  file_hash: string
  imported_at: string
  total_parsed: number
  inserted: number
  duplicates_skipped: number
  transfers_flagged: number
  status: ImportStatus
  error_message: string | null
  account?: Account
}

// Used during import preview (before DB insert)
export interface ParsedTransaction {
  date: string          // ISO date string YYYY-MM-DD
  description: string
  amount_cents: number  // negative = debit, positive = credit
  import_hash: string
  is_transfer: boolean
  suggested_category_id: string | null
  is_duplicate: boolean
}

// Budget vs actual per category
export interface BudgetStatus {
  category: Category
  budget_cents: number
  spent_cents: number
  remaining_cents: number
  percent_used: number
}

// Cashflow forecast
export interface DailyBalance {
  date: string
  balance_cents: number
  is_projected: boolean
}

export interface RecurringPayment {
  payee: string
  expected_amount_cents: number
  expected_date: string
  account_id: string
  confidence: 'auto' | 'confirmed'
  last_seen_date: string
}
