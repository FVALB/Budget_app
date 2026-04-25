import { NextRequest, NextResponse } from 'next/server'
import { getHousehold, updateHousehold } from '@/server/db/households'
import { z } from 'zod'

export async function GET() {
  const household = await getHousehold()
  if (!household) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(household)
}

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  safety_threshold_cents: z.number().int().min(0).optional(),
})

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  try {
    await updateHousehold(parsed.data)
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
