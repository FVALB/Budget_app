# Budget App

Household budget tracking app for Felipe + Monica. Tracks 3 bank accounts (Banque Populaire Checking, Revolut Personal, Revolut Joint) via PDF import, with custom categories, monthly budget vs actuals, and a daily cashflow forecast to avoid end-of-month crunch.

## Tech Stack

- **Framework:** Next.js 15 (App Router, TypeScript strict)
- **UI:** Tailwind CSS + shadcn/ui
- **Database + Auth:** Supabase (PostgreSQL + email/password auth)
- **Charts:** Recharts
- **PDF Parsing:** pdf-parse (server-side)
- **Deployment:** Vercel

## Quick Start

See [docs/SETUP.md](docs/SETUP.md) for full setup instructions.

```bash
cp .env.example .env.local
# fill in your Supabase URL and anon key
npm install
npm run dev
```

## Documentation

| File | Purpose |
|---|---|
| [docs/SETUP.md](docs/SETUP.md) | Installation, Supabase config, Vercel deploy |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Folder structure, data flow, design decisions |
| [docs/IMPORT-GUIDE.md](docs/IMPORT-GUIDE.md) | How to export PDFs from BP and Revolut |
| [TODO.md](TODO.md) | Phase-by-phase build roadmap |
| [CHANGELOG.md](CHANGELOG.md) | Version history |

## Version

Current: **v0.1.0** — see [CHANGELOG.md](CHANGELOG.md)
