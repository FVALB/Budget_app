# Setup Guide

Complete instructions for installing, configuring, and deploying the Budget App.

---

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | 18+ | [nodejs.org](https://nodejs.org) |
| npm | 9+ | included with Node.js |
| Git | any | [git-scm.com](https://git-scm.com) |
| Supabase account | free tier | [supabase.com](https://supabase.com) |
| Vercel account (for deploy) | free tier | [vercel.com](https://vercel.com) |

---

## Step 1 — Clone and Install

```bash
cd "path/to/your/dev/folder"
# The budget-app folder already exists from the scaffold
cd "budget-app"
npm install
```

---

## Step 2 — Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **New Project**
3. Fill in:
   - **Name:** `budget-app`
   - **Region:** `West EU (Paris)` — closest to France
   - **Database Password:** choose a strong password and save it
4. Wait ~2 minutes for the project to provision

---

## Step 3 — Run Database Migrations

1. In your Supabase project, go to **SQL Editor** (left sidebar)
2. Click **New query**
3. Copy the entire contents of `supabase/migrations/001_initial_schema.sql`
4. Paste into the editor and click **Run**
5. You should see: `Success. No rows returned.`
6. Verify in **Table Editor** that these tables exist:
   - households, accounts, categories, budgets, transactions, import_logs

> The category seed (`002_seed_categories.sql`) runs automatically when the first user registers.

---

## Step 4 — Configure Auth

1. In Supabase → **Authentication** → **Providers**
   - Email: enabled (default)
   - Toggle **Confirm email** → OFF (for easier local development, turn ON for production)
2. Go to **Authentication** → **URL Configuration**
   - Add `http://localhost:3000` to **Redirect URLs**
   - Add `http://localhost:3000/**` to **Redirect URLs** (catch-all)

---

## Step 5 — Get API Keys

1. Supabase → **Project Settings** → **API**
2. Copy:
   - **Project URL** → this is your `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public** key → this is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## Step 6 — Configure Environment Variables

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
LOG_LEVEL=info
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Step 7 — Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you should see the login page.

---

## Step 8 — First Registration

1. Go to `/register`
2. Enter your name (household name), email, and password
3. This creates:
   - Your Supabase user account
   - A household record
   - 3 default accounts (BP Checking, Revolut Personal, Revolut Joint)
   - Default category tree

---

## Step 9 — Invite Monica (Partner)

1. After logging in, go to **Settings** → **Household**
2. Click **Invite Partner**
3. Copy the invite link and send it to Monica
4. Monica opens the link and registers with her email/password
5. She joins the same household and sees all shared data

---

## Step 10 — Deploy to Vercel

```bash
# First commit your code to GitHub
git add .
git commit -m "Initial build v0.1.0"
git remote add origin https://github.com/yourusername/budget-app.git
git push origin main
```

Then:

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import from GitHub → select `budget-app`
3. Framework: **Next.js** (auto-detected)
4. **Environment Variables** — add these:
   ```
   NEXT_PUBLIC_SUPABASE_URL = (same as local)
   NEXT_PUBLIC_SUPABASE_ANON_KEY = (same as local)
   LOG_LEVEL = info
   NEXT_PUBLIC_APP_URL = https://your-app-name.vercel.app
   ```
5. Click **Deploy** — wait ~2 min

6. After deploy, update Supabase:
   - Authentication → URL Configuration → add `https://your-app-name.vercel.app/**`

---

## Updating Categories

Your custom category list goes in `supabase/migrations/002_seed_categories.sql`.

When you're ready to provide your personal categories:
1. Edit `002_seed_categories.sql` with your category names
2. Run the updated SQL in Supabase SQL Editor
3. Or update categories directly in the app: **Settings** → **Categories**

---

## Troubleshooting

| Problem | Solution |
|---|---|
| Login redirect loop | Check Supabase → Auth → URL Configuration has your localhost URL |
| PDF parse returns 0 transactions | Check console logs for parser warnings; PDF layout may have changed |
| Supabase RLS error | Check that `household_id` is in user metadata after registration |
| Vercel deploy fails | Check that all env vars are set in Vercel project settings |
