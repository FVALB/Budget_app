import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { upsertBudget, copyBudgetsFromLastMonth } from '@/server/db/budgets'
import { z } from 'zod'

const upsertSchema = z.object({
  category_id: z.string().uuid(),
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(1).max(12),
  amount_cents: z.number().int().min(0),
})

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const household_id = user.user_metadata?.household_id as string | undefined
  if (!household_id) return NextResponse.json({ error: 'No household' }, { status: 400 })

  const body = await req.json().catch(() => null)

  // Copy-from-last-month shortcut
  if (body?.action === 'copy_from_last_month') {
    const { year, month } = z.object({ year: z.number(), month: z.number() }).parse(body)
    await copyBudgetsFromLastMonth(household_id, year, month)
    return NextResponse.json({ ok: true })
  }

  const parsed = upsertSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  try {
    await upsertBudget({ household_id, ...parsed.data })
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
