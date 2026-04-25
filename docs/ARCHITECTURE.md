# Architecture Guide

How the Budget App is structured and how data flows through the system.

---

## Folder Structure

```
src/
├── app/                    ROUTES ONLY — no business logic here
│   ├── (auth)/             Login, register, invite pages
│   ├── (dashboard)/        All authenticated pages
│   │   ├── layout.tsx      Sidebar + top nav shell
│   │   ├── page.tsx        Dashboard home
│   │   ├── transactions/
│   │   ├── budget/
│   │   ├── import/
│   │   └── settings/
│   ├── api/                Server-side API routes
│   │   ├── import/         PDF upload + parse
│   │   ├── import/confirm/ Insert confirmed transactions
│   │   ├── transactions/   Read/update transactions
│   │   ├── budgets/        Read/write budget targets
│   │   └── cashflow/       Forecast data
│   └── globals.css         Design tokens (CSS custom properties)
│
├── features/               FEATURE MODULES — self-contained
│   ├── import/             PDF import pipeline
│   │   ├── parsers/        bp-parser.ts, revolut-parser.ts
│   │   ├── transfer-detector.ts
│   │   ├── dedup.ts
│   │   └── import-logger.ts
│   ├── transactions/       Transaction list + filters
│   ├── cashflow/           Forecast chart + recurring detection
│   │   └── recurring.ts    Detection algorithm
│   ├── budget/             Budget form + progress bars
│   ├── categories/         Category CRUD
│   ├── accounts/           Account cards
│   ├── auth/               Auth forms
│   └── dashboard/          Dashboard widget components
│
├── components/
│   ├── ui/                 shadcn/ui primitives (auto-generated)
│   └── shared/             App-wide: Sidebar, TopNav, PageHeader
│
├── lib/                    PURE UTILITIES — no DB calls
│   ├── supabase/           client.ts (browser), server.ts (SSR)
│   ├── currency.ts         EUR formatting
│   ├── date.ts             Date helpers (month ranges, ISO dates)
│   └── logger.ts           pino logger singleton
│
├── server/db/              DB QUERY FUNCTIONS — server-side only
│   ├── transactions.ts
│   ├── accounts.ts
│   ├── categories.ts
│   └── budgets.ts
│
└── types/
    ├── app.ts              Domain types (Account, Transaction, etc.)
    └── database.ts         Supabase generated types (run: supabase gen types)
```

---

## Design Principles

### 1. Routes are dumb — features are smart
`app/` pages import from `features/`. Logic, state, and components live in `features/`.

### 2. Server DB functions are server-only
`server/db/` files use the server Supabase client and cannot be imported into client components. They are called from API routes and Server Components only.

### 3. Amount storage: always integer cents
All monetary values in the database are stored as `bigint` in cents to avoid floating-point precision errors. `€1.50 = 150`.

### 4. Design tokens via CSS custom properties
All colors come from `globals.css` CSS vars. Never hardcode hex values in components.

```css
/* Use this: */
color: var(--budget-success)

/* Never this: */
color: #16A34A
```

### 5. Amounts use monospace font
Any component displaying a monetary amount should use the `.amount` CSS class or `font-mono`.

---

## Data Flow

### Import Flow
```
User uploads PDF
    → UploadDropzone.tsx
    → POST /api/import
        → computeFileHash()     [dedup check — file already uploaded?]
        → pdf-parse()           [extract raw text from PDF]
        → parseBanquePopulairePDF() OR parseRevolutPDF()
        → flagTransfers()       [detect inter-account transfers]
        → deduplicateTransactions() [check existing import_hash values]
    ← Preview JSON (new txs, duplicate count, warnings)
    → TransactionReviewTable.tsx [user edits categories, removes rows]
    → POST /api/import/confirm
        → INSERT transactions
        → INSERT import_logs
        → logImportComplete()   [pino log]
```

### Dashboard Flow
```
Dashboard page (Server Component)
    → getAccounts() + getBudgets() + getTransactions()
    → GET /api/cashflow
        → detectRecurringPayments()
        → buildDailyForecast()
    ← Hydrates dashboard widgets
```

### Auth + Household Flow
```
Register page
    → supabase.auth.signUp()
    → Create household row
    → Update user metadata { household_id }
    → Insert 3 accounts (BP Checking, Revolut Personal, Revolut Joint)
    → Seed categories from 002_seed_categories.sql data
    → Redirect to dashboard

Invite flow
    → Settings page generates signed JWT with { household_id }
    → Monica opens link → /invite?token=...
    → InviteForm validates token, calls signUp()
    → User metadata set to same household_id
    → Monica now sees same data (RLS filters by household_id)
```

---

## Database Schema Summary

```
households
  └── accounts (1:many)
  └── categories (1:many, self-referential for parent/child)
  └── budgets (1:many, per category per month)
  └── transactions (1:many, via account)
  └── import_logs (1:many)

transactions
  └── category_id → categories
  └── account_id → accounts
  └── transfer_pair → transactions (self-referential, links transfer sides)
```

### Row-Level Security (RLS)
All tables have RLS enabled. The helper function `auth_household_id()` reads `household_id` from the JWT user metadata. Every table policy uses:
```sql
USING (household_id = auth_household_id())
```
This ensures users can only see/modify their own household's data.

---

## Design Token Reference

| Variable | Usage |
|---|---|
| `--budget-success` | Under budget, positive cashflow, income amounts |
| `--budget-warning` | 80-100% of budget used |
| `--budget-danger` | Over budget, negative cashflow, below safety threshold |
| `--amount-positive` | Positive amounts (= `--budget-success`) |
| `--amount-negative` | Negative amounts (= `--budget-danger`) |
| `--forecast-actual` | Solid line on forecast chart (past days) |
| `--forecast-projected` | Dashed line on forecast chart (future days) |
| `--forecast-danger-zone` | Red band below safety threshold on forecast chart |
| `--account-bp` | BP account badge/accent color |
| `--account-revolut-pers` | Revolut Personal badge/accent color |
| `--account-revolut-joint` | Revolut Joint badge/accent color |

---

## Key Technical Decisions

### Why Supabase?
- Handles auth + database in one service
- RLS is built-in — household isolation without extra code
- Free tier covers this use case comfortably
- Real-time subscriptions available for future features

### Why pdf-parse (server-side only)?
PDF parsing in the browser causes memory issues with large files and exposes parsing logic to the client. `pdf-parse` runs in Next.js API routes (serverless functions on Vercel).

### Why integer cents?
`0.1 + 0.2 !== 0.3` in floating point. Storing `€1,103.90` as `110390` avoids rounding bugs in budget calculations.

### Why fuse.js for recurring detection?
Bank statement descriptions include reference codes that change each month (e.g., `PRLV SEPA ECOLE MONTESSO 0G9SOF4` vs `PRLV SEPA ECOLE MONTESSO 00BYQXY`). Exact string matching would never group these. Fuzzy matching with a 0.25 threshold groups them correctly.
