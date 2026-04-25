import { NextRequest, NextResponse } from 'next/server'
import { updateTransactionCategory } from '@/server/db/transactions'
import { z } from 'zod'

const patchSchema = z.object({
  id: z.string().uuid(),
  category_id: z.string().uuid().nullable(),
})

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  try {
    await updateTransactionCategory(parsed.data.id, parsed.data.category_id)
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
