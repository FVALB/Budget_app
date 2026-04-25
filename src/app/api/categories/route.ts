import { NextRequest, NextResponse } from 'next/server'
import { createCategory, getCategories } from '@/server/db/categories'
import { z } from 'zod'

export async function GET() {
  const categories = await getCategories()
  return NextResponse.json(categories)
}

const postSchema = z.object({
  name: z.string().min(1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  parent_id: z.string().uuid().nullable().optional(),
})

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = postSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  try {
    const supabase = await import('@/lib/supabase/server').then((m) => m.createClient())
    const { data: { user } } = await supabase.auth.getUser()
    const household_id = user?.user_metadata?.household_id
    if (!household_id) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

    const category = await createCategory({
      household_id,
      name: parsed.data.name,
      color: parsed.data.color,
      parent_id: parsed.data.parent_id ?? null,
      icon: null,
      sort_order: 0,
    })
    return NextResponse.json(category)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
