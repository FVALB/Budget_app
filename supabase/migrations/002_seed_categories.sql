-- ─────────────────────────────────────────────────────────────────────────────
-- 002_seed_categories.sql
-- Default category seed — called after register() creates the household.
-- Pass the new household_id as a parameter in the app (server action).
-- This file documents the seed data; the app runs it via a server function.
-- ─────────────────────────────────────────────────────────────────────────────
--
-- HOW TO USE:
-- In Supabase SQL editor, replace :HOUSEHOLD_ID with the actual UUID, then run.
-- The app seeds these automatically on first registration.
--
-- Example:
--   \set household_id '00000000-0000-0000-0000-000000000000'
--   [then run the INSERT statements below]
--
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Top-level categories ───────────────────────────────────────────────────

WITH inserted AS (
  INSERT INTO categories (household_id, name, color, sort_order) VALUES
    (:household_id, 'Incomes',             '#16A34A', 1),
    (:household_id, 'Utilities',           '#0891B2', 2),
    (:household_id, 'Shopping',            '#DB2777', 3),
    (:household_id, 'Food',                '#15803D', 4),
    (:household_id, 'Transports',          '#D97706', 5),
    (:household_id, 'Bank',                '#64748B', 6),
    (:household_id, 'BusiServ',            '#475569', 7),
    (:household_id, 'Care',                '#F43F5E', 8),
    (:household_id, 'Taxes',               '#DC2626', 9),
    (:household_id, 'Home',                '#1E40AF', 10),
    (:household_id, 'Entertainment',       '#8B5CF6', 11),
    (:household_id, 'Withdrawals',         '#9CA3AF', 12),
    (:household_id, 'Health',              '#EF4444', 13),
    (:household_id, 'Savings',             '#0D9488', 14)
  RETURNING id, name
)

-- ─── Subcategories (reference parent by name via CTE) ──────────────────────

INSERT INTO categories (household_id, name, parent_id, color, sort_order)
SELECT
  :household_id,
  sub.name,
  inserted.id,
  inserted_color.color,
  sub.sort_order
FROM (VALUES
  ('Utilities',            'Subscription - Others', 1),
  ('Utilities',            'Cable TV', 2),
  ('Utilities',            'Internet', 3),
  ('Utilities',            'Mobile phone', 4),
  ('Shopping',             'Shopping - Others', 1),
  ('Shopping',             'Gifts', 2),
  ('Shopping',             'High Tech', 3),
  ('Shopping',             'Clothing & Shoes', 4),
  ('Food',                 'Cantinne', 1),
  ('Food',                 'Supermarkets / Groceries', 2),
  ('Transports',           'Fines', 1),
  ('Transports',           'Auto insurance', 2),
  ('Transports',           'Plane ticket', 3),
  ('Transports',           'Gas & Fuel', 4),
  ('Transports',           'Tolls', 5),
  ('Transports',           'Parking', 6),
  ('Transports',           'Public transportation', 7),
  ('Transports',           'Garage', 8),
  ('Bank',                 'Monthly Debit', 1),
  ('Bank',                 'Banking fees and charges', 2),
  ('Bank',                 'Payment incidents', 3),
  ('Bank',                 'Mortgage refund', 4),
  ('Bank',                 'Banking services', 5),
  ('BusiServ',             'Accounting', 1),
  ('Incomes',              'Other incomes', 1),
  ('Incomes',              'Rent', 2),
  ('Incomes',              'Refunds', 3),
  ('Incomes',              'Salaries', 4),
  ('Incomes',              'Internal transfer', 5),
  ('Care',                 'Hairdresser', 1),
  ('Care',                 'Spa', 2),
  ('Taxes',                'Taxes - Others', 1),
  ('Taxes',                'Property taxes', 2),
  ('Taxes',                'Taxes', 3),
  ('Home',                 'Home insurance', 1),
  ('Home',                 'Misc. utilities', 2),
  ('Home',                 'Cleaning', 3),
  ('Home',                 'Electricity', 4),
  ('Home',                 'Rent', 5),
  ('Home',                 'Home improvement', 6),
  ('Entertainment',        'Bars & Clubs', 1),
  ('Entertainment',        'Amusements', 2),
  ('Entertainment',        'Entertainment - Others', 3),
  ('Entertainment',        'Eating out', 4),
  ('Entertainment',        'Arts & Amusement', 5),
  ('Entertainment',        'Travels / Vacation', 6),
  ('Entertainment',        'Sports', 7),
  ('Withdrawals',          'Allowance', 1),
  ('Withdrawals',          'Withdrawals', 2),
  ('Withdrawals',          'Transfer', 3),
  ('Withdrawals',          'Internal transfer', 4),
  ('Health',               'Health insurance', 1),
  ('Health',               'Pharmacy', 2),
  ('Health',               'Hospital / Consultation', 3),
  ('Savings',              'Assurance vie', 1),
  ('Savings',              'Crypto', 2),
  ('Savings',              'LivretA', 3)
) AS sub(parent_name, name, sort_order)
JOIN inserted ON inserted.name = sub.parent_name
JOIN (
  SELECT id, color FROM inserted
) AS inserted_color ON inserted_color.id = inserted.id;
