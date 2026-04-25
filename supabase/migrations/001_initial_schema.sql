-- ─────────────────────────────────────────────────────────────────────────────
-- 001_initial_schema.sql
-- Run once in Supabase SQL editor to set up the full schema.
-- ─────────────────────────────────────────────────────────────────────────────

-- Households group users together (family / shared budget)
CREATE TABLE households (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  safety_threshold_cents bigint NOT NULL DEFAULT 30000, -- €300 default
  created_at timestamptz DEFAULT now()
);

-- Accounts (linked to a household)
CREATE TABLE accounts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name         text NOT NULL,
  bank         text NOT NULL CHECK (bank IN ('banque_populaire', 'revolut')),
  account_type text NOT NULL CHECK (account_type IN ('checking', 'personal', 'joint')),
  currency     text NOT NULL DEFAULT 'EUR',
  is_active    boolean DEFAULT true,
  created_at   timestamptz DEFAULT now()
);

-- Categories (2 levels: parent + child)
CREATE TABLE categories (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name         text NOT NULL,
  parent_id    uuid REFERENCES categories(id) ON DELETE SET NULL,
  color        text NOT NULL DEFAULT '#64748B',
  icon         text,
  sort_order   int  NOT NULL DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);

-- Monthly budget targets per category
CREATE TABLE budgets (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  category_id  uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  year         int  NOT NULL,
  month        int  NOT NULL CHECK (month BETWEEN 1 AND 12),
  amount_cents bigint NOT NULL DEFAULT 0,
  UNIQUE (household_id, category_id, year, month)
);

-- Transactions imported from bank PDFs
CREATE TABLE transactions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id   uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  account_id     uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  date           date NOT NULL,
  description    text NOT NULL,
  amount_cents   bigint NOT NULL,          -- negative = debit, positive = credit
  category_id    uuid REFERENCES categories(id) ON DELETE SET NULL,
  is_transfer    boolean NOT NULL DEFAULT false,
  transfer_pair  uuid REFERENCES transactions(id) ON DELETE SET NULL,
  import_hash    text UNIQUE NOT NULL,     -- sha256(account_id+date+description+amount_cents)
  reviewed       boolean NOT NULL DEFAULT false,
  created_at     timestamptz DEFAULT now()
);

-- Log of every import operation (for dedup and audit)
CREATE TABLE import_logs (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id       uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  account_id         uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  filename           text NOT NULL,
  file_hash          text NOT NULL,        -- sha256 of raw PDF bytes
  imported_at        timestamptz DEFAULT now(),
  total_parsed       int  NOT NULL DEFAULT 0,
  inserted           int  NOT NULL DEFAULT 0,
  duplicates_skipped int  NOT NULL DEFAULT 0,
  transfers_flagged  int  NOT NULL DEFAULT 0,
  status             text NOT NULL CHECK (status IN ('success', 'error', 'duplicate_file')),
  error_message      text
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────

CREATE INDEX idx_transactions_household_date  ON transactions(household_id, date DESC);
CREATE INDEX idx_transactions_account_date    ON transactions(account_id, date DESC);
CREATE INDEX idx_transactions_category        ON transactions(category_id);
CREATE INDEX idx_transactions_is_transfer     ON transactions(household_id, is_transfer);
CREATE INDEX idx_budgets_period               ON budgets(household_id, year, month);
CREATE INDEX idx_import_logs_file_hash        ON import_logs(file_hash);

-- ─── Row-Level Security ───────────────────────────────────────────────────────

ALTER TABLE households   ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories   ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets      ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_logs  ENABLE ROW LEVEL SECURITY;

-- Helper: get household_id from JWT claims
CREATE OR REPLACE FUNCTION auth_household_id()
RETURNS uuid LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT (auth.jwt() -> 'user_metadata' ->> 'household_id')::uuid;
$$;

-- Policy factory pattern
CREATE POLICY "household_rls_households"   ON households   USING (id = auth_household_id());
CREATE POLICY "household_rls_accounts"     ON accounts     USING (household_id = auth_household_id());
CREATE POLICY "household_rls_categories"   ON categories   USING (household_id = auth_household_id());
CREATE POLICY "household_rls_budgets"      ON budgets      USING (household_id = auth_household_id());
CREATE POLICY "household_rls_transactions" ON transactions USING (household_id = auth_household_id());
CREATE POLICY "household_rls_import_logs"  ON import_logs  USING (household_id = auth_household_id());

-- INSERT policies (same constraint)
CREATE POLICY "household_insert_accounts"     ON accounts     FOR INSERT WITH CHECK (household_id = auth_household_id());
CREATE POLICY "household_insert_categories"   ON categories   FOR INSERT WITH CHECK (household_id = auth_household_id());
CREATE POLICY "household_insert_budgets"      ON budgets      FOR INSERT WITH CHECK (household_id = auth_household_id());
CREATE POLICY "household_insert_transactions" ON transactions FOR INSERT WITH CHECK (household_id = auth_household_id());
CREATE POLICY "household_insert_import_logs"  ON import_logs  FOR INSERT WITH CHECK (household_id = auth_household_id());
