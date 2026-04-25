# Budget App — Build Roadmap

This file is the canonical task list for building the app.
Each phase must be completed before starting the next.
Use this when switching between tools (Claude, Gemini, manual coding).

**Status key:** ✅ Done | 🔄 In Progress | ⬜ Not started

---

## Phase 1 — Project Foundation ✅

### 1.1 Scaffold & Dependencies ✅
- ✅ `npx create-next-app@latest budget-app --typescript --tailwind --app --eslint --src-dir`
- ✅ Install: `@supabase/supabase-js @supabase/ssr recharts fuse.js zod pino pino-pretty`
- ✅ Install: `pdf-parse @types/pdf-parse`
- ✅ Init shadcn/ui: `npx shadcn@latest init`
- ✅ Add components: card, badge, input, label, select, table, dialog, dropdown-menu, separator, sheet, tabs, progress, sonner

### 1.2 Folder Structure ✅
- ✅ `src/features/` — import, transactions, cashflow, budget, categories, accounts, auth, dashboard
- ✅ `src/app/(auth)/` — login, register, invite routes
- ✅ `src/app/(dashboard)/` — page, transactions, budget, import, settings routes
- ✅ `src/app/api/` — import, import/confirm, transactions, budgets, cashflow, categories, accounts, household, invite routes
- ✅ `src/lib/supabase/` — client.ts, server.ts
- ✅ `src/lib/` — currency.ts, date.ts, logger.ts
- ✅ `src/server/db/` — transactions.ts, accounts.ts, categories.ts, budgets.ts, households.ts, cashflow.ts
- ✅ `src/types/` — app.ts
- ✅ `supabase/migrations/` — 001_initial_schema.sql, 002_seed_categories.sql
- ✅ `docs/` — SETUP.md, ARCHITECTURE.md, IMPORT-GUIDE.md

### 1.3 Design Tokens ✅
- ✅ `globals.css` — budget colors (success, warning, danger), amount classes, account accent colors

### 1.4 Core Logic ✅
- ✅ `bp-parser.ts` — Banque Populaire PDF parser (European format)
- ✅ `revolut-parser.ts` — Revolut PDF parser (English format, Personal + Joint)
- ✅ `transfer-detector.ts` — 6 auto-detection rules from real statement data
- ✅ `dedup.ts` — sha256 import_hash per transaction + file_hash for file dedup
- ✅ `cashflow/recurring.ts` — recurring payment detection + daily forecast builder
- ✅ `import-logger.ts` — structured pino logging for all import events

---

## Phase 2 — Supabase Setup ✅

### 2.1 Create Supabase Project ✅
1. Go to [supabase.com](https://supabase.com) → New project
2. Name: `budget-app` | Region: `West EU (Paris)` | Password: choose a strong one
3. Wait for project to provision (~2 min)

### 2.2 Run Database Migrations ✅
1. In Supabase Dashboard → SQL Editor
2. Paste and run `supabase/migrations/001_initial_schema.sql`
3. Verify tables created: households, accounts, categories, budgets, transactions, import_logs

### 2.3 Configure Auth ✅
1. Supabase Dashboard → Authentication → Configuration: **Sign In / Providers** → Email: Enable "Confirm email" = OFF (for easier testing)
2. Authentication → Email Templates → customize if desired
3. Authentication → Configuration: **URL Configuration** → add `http://localhost:3000` to allowed redirect URLs

### 2.4 Get API Keys ✅
1. Supabase Dashboard → Project Settings → API
2. Copy `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
3. Copy `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Create `.env.local` from `.env.example` and fill these values

---

## Phase 3 — Auth Pages ✅

- ✅ `src/app/(auth)/login/page.tsx` + `LoginForm.tsx`
- ✅ `src/app/(auth)/register/page.tsx` + `RegisterForm.tsx`
- ✅ `src/app/(auth)/invite/page.tsx` — joins existing household via invite token
- ✅ `src/middleware.ts` — redirects unauthenticated to /login
- ✅ `src/app/api/auth/register/route.ts` — creates household, 3 accounts, seeds categories

**What register does:**
1. Creates Supabase auth user (email + password)
2. Creates a `households` row with household name
3. Stores `household_id` in `auth.users.raw_user_meta_data`
4. Inserts 3 accounts (BP Checking, Revolut Personal, Revolut Joint)
5. Seeds 12 top-level categories + subcategories

**Invite flow:**
1. User A goes to Settings → Household → "Generate invite link"
2. Link contains base64-encoded `{ household_id, exp }` token (7-day TTL)
3. User B opens link → registers → joins the same household

---

## Phase 4 — Import Pipeline ✅

- ✅ `src/app/api/import/route.ts` — POST: receives PDF, parses, deduplicates, returns preview
- ✅ `src/app/api/import/confirm/route.ts` — POST: inserts confirmed transactions, writes import_log
- ✅ `src/features/import/components/UploadDropzone.tsx` — drag-and-drop file upload
- ✅ `src/app/(dashboard)/import/page.tsx` — account selector (from DB), upload UI, review table, confirm

**API flow:**
1. `computeFileHash(buffer)` → check `import_logs` for existing `file_hash`
2. If found: return `{ status: 'duplicate_file' }` → toast error in UI
3. Select parser based on `account.bank` (banque_populaire | revolut)
4. `flagTransfers()` → `deduplicateTransactions()` → return preview JSON
5. On confirm: insert transactions + write import_log + pino log

---

## Phase 5 — Transactions Page ✅

- ✅ `src/app/(dashboard)/transactions/page.tsx` — server component
- ✅ `src/app/(dashboard)/transactions/TransactionsClient.tsx` — client component
- ✅ Filter by: account, category (including "uncategorized"), text search
- ✅ Inline category editing (click category badge → dropdown)
- ✅ `src/app/api/transactions/route.ts` — PATCH endpoint for category assignment
- ✅ Color-coded amounts (green = income, red = expense)

---

## Phase 6 — Budget Page ✅

- ✅ `src/app/(dashboard)/budget/page.tsx` — server component
- ✅ `src/app/(dashboard)/budget/BudgetClient.tsx` — client with inline editing
- ✅ `src/app/api/budgets/route.ts` — POST upsert + "copy from last month" action
- ✅ Click any amount to edit inline (type euros, Enter to save)
- ✅ "Copy from last month" button → calls `copyBudgetsFromLastMonth()`
- ✅ Per-category progress bars (green <80%, amber 80-100%, red >100%)
- ✅ Total row with overall progress bar

---

## Phase 7 — Settings Page ✅

- ✅ `src/app/(dashboard)/settings/page.tsx` — server component
- ✅ `src/app/(dashboard)/settings/SettingsClient.tsx` — 3-tab client component
- ✅ `src/features/accounts/components/AccountCard.tsx` — display + rename
- ✅ `src/features/categories/components/CategoryManager.tsx` — full CRUD tree
- ✅ `src/app/api/categories/route.ts` — GET + POST
- ✅ `src/app/api/categories/[id]/route.ts` — PATCH + DELETE
- ✅ `src/app/api/accounts/[id]/route.ts` — PATCH (rename)
- ✅ `src/app/api/accounts/route.ts` — GET (used by import page)
- ✅ `src/app/api/household/route.ts` — GET + PATCH (safety threshold)
- ✅ `src/app/api/invite/route.ts` — POST: generates invite URL
- ✅ `src/server/db/households.ts` — getHousehold, updateHousehold

**Features:**
- Categories tab: double-click to rename, click dot to change color, +sub to add subcategory, ✕ to delete
- Accounts tab: rename accounts inline
- Household tab: set safety threshold (€), generate invite link

---

## Phase 8 — Cashflow Feature ✅

- ✅ `src/features/cashflow/components/ForecastChart.tsx` — Recharts area chart
- ✅ `src/features/cashflow/components/UpcomingPayments.tsx` — upcoming recurring list
- ✅ `src/features/cashflow/components/SafeToSpend.tsx` — large number card
- ✅ `src/app/api/cashflow/route.ts` — GET: delegates to getCashflowData()
- ✅ `src/server/db/cashflow.ts` — shared cashflow computation (used by both dashboard and API)

**ForecastChart:**
- Recharts ComposedChart with Area (actuals) + Line (projected, dashed)
- ReferenceLine for today and safety threshold
- Tooltip: date + balance + "projected" label if future

---

## Phase 9 — Dashboard ✅

- ✅ `src/app/(dashboard)/page.tsx` — assembles all widgets
- ✅ `src/app/(dashboard)/layout.tsx` — sidebar + main content shell
- ✅ `src/components/shared/Sidebar.tsx` — nav links with active state
- ✅ `src/features/dashboard/components/AccountBalanceCard.tsx`
- ✅ `src/features/dashboard/components/BudgetOverview.tsx`
- ✅ `src/features/dashboard/components/RecentTransactions.tsx`
- ✅ `src/features/dashboard/components/SpendingTrendChart.tsx` — 6-month bar+line chart
- ✅ `src/features/dashboard/components/SpendingTrendChartClient.tsx`

**Dashboard layout:**
```
Row 1: [BP Balance] [Revolut Pers.] [Revolut Joint] [Safe to Spend]
Row 2: [Cashflow Forecast Chart ─────────────────] [Upcoming Payments]
Row 3: [Budget vs Actual progress bars ──────────────────────────────]
Row 4: [6-month Spending Trend Chart ──────────] [Recent Transactions]
```

---

## Phase 10 — Deploy to Vercel ⬜

1. Push code to GitHub: `git init && git add . && git commit -m "Initial build" && git remote add origin <url> && git push`
2. Go to [vercel.com](https://vercel.com) → Import project from GitHub
3. Framework: Next.js (auto-detected)
4. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `LOG_LEVEL=info`
   - `NEXT_PUBLIC_APP_URL=https://your-app.vercel.app`
5. Deploy
6. Update Supabase Auth → URL Configuration → add your Vercel URL

---

## Phase 11 — Verification ⬜

- [ ] Import a BP PDF → correct transaction count, European amounts parsed
- [ ] Import same BP PDF again → "Already imported" error shown
- [ ] Import Revolut Personal PDF → amounts in English format parsed
- [ ] Import Revolut Joint PDF → parsed with same parser
- [ ] BP "Revolut**8633*" transactions auto-flagged as transfers in review
- [ ] Revolut "Top-up by *0518" transactions auto-flagged as transfers
- [ ] Budget vs Actual excludes all transfer transactions
- [ ] Daily balance chart shows end-of-month dip with ICF SABLIER + ECOLE MONTESSORI
- [ ] Safe to Spend card shows correct amount
- [ ] Monica registers via invite link → sees same household data
- [ ] Mobile browser: import flow works, dashboard readable

---

## Backlog (Post v1.0)

- [ ] Category auto-suggestion from description (simple keyword matching)
- [ ] Export transactions to CSV
- [ ] Dark mode toggle in top nav
- [ ] Monthly email summary
- [ ] Multi-currency support (for taptap send transactions)
- [ ] Budget alerts (notification when 80% of category budget used)
- [ ] Year-over-year spending comparison
