import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logImportComplete, logImportError } from '@/features/import/import-logger'
import { z } from 'zod'

const ConfirmedTransaction = z.object({
  date: z.string(),
  description: z.string(),
  amount_cents: z.number(),
  import_hash: z.string(),
  is_transfer: z.boolean(),
  category_id: z.string().nullable().optional(),
})

const schema = z.object({
  account_id: z.string().uuid(),
  file_hash: z.string(),
  filename: z.string(),
  transactions: z.array(ConfirmedTransaction),
})

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const household_id = user.user_metadata?.household_id
  if (!household_id) return NextResponse.json({ error: 'No household' }, { status: 400 })

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { account_id, file_hash, filename, transactions } = parsed.data

  try {
    // Insert transactions
    if (transactions.length > 0) {
      const rows = transactions.map((tx) => ({
        household_id,
        account_id,
        date: tx.date,
        description: tx.description,
        amount_cents: tx.amount_cents,
        import_hash: tx.import_hash,
        is_transfer: tx.is_transfer,
        category_id: tx.category_id ?? null,
        reviewed: !!tx.category_id,
      }))

      const { error } = await supabase.from('transactions').insert(rows)
      if (error) throw error
    }

    const transferCount = transactions.filter((t) => t.is_transfer).length

    // Write import log
    const { error: logError } = await supabase.from('import_logs').insert({
      household_id,
      account_id,
      filename,
      file_hash,
      total_parsed: transactions.length,
      inserted: transactions.length,
      duplicates_skipped: 0,
      transfers_flagged: transferCount,
      status: 'success',
    })
    if (logError) throw logError

    logImportComplete({
      household_id,
      account_id,
      filename,
      file_hash,
      imported_at: new Date().toISOString(),
      total_parsed: transactions.length,
      inserted: transactions.length,
      duplicates_skipped: 0,
      transfers_flagged: transferCount,
      status: 'success',
      error_message: null,
    })

    return NextResponse.json({ ok: true, inserted: transactions.length })
  } catch (err) {
    logImportError(filename, err)
    return NextResponse.json({ error: 'Failed to save transactions' }, { status: 500 })
  }
}
