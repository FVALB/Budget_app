# Changelog

All notable changes to this project are documented here.
Format: [Semantic Versioning](https://semver.org/) — Major.Minor.Patch

---

## [0.1.0] — 2026-04-25

### Added
- Initial project scaffold (Next.js 15, TypeScript, Tailwind CSS, shadcn/ui)
- Project folder structure: features/, server/db/, lib/, types/, docs/
- Design token system in globals.css (budget colors, amount formatting)
- Supabase schema: households, accounts, categories, budgets, transactions, import_logs
- Default category seed: Income, Housing, Education, Subscriptions, Transport, Groceries, etc.
- PDF parsers: Banque Populaire (French format) and Revolut (English format)
- Inter-account transfer auto-detection (6 rules from real statement patterns)
- Transaction deduplication via sha256 import_hash
- File-level duplicate import detection via file_hash
- Recurring payment detection using fuzzy payee grouping (fuse.js)
- Daily balance forecast builder (actual + projected)
- Structured logging (pino) for all import events
- Core DB query functions: transactions, accounts, categories, budgets
- `.env.example`, `CHANGELOG.md`, `TODO.md`, `README.md`
- `docs/SETUP.md`, `docs/ARCHITECTURE.md`, `docs/IMPORT-GUIDE.md`

### Pending (next milestones)
- Auth pages (login, register, invite)
- Import UI (upload dropzone + review table)
- Transactions page with filters
- Budget page
- Cashflow dashboard widget
- Full dashboard assembly
- Vercel deployment
