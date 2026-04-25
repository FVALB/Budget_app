import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const household_id = user.user_metadata?.household_id
  if (!household_id) return NextResponse.json({ error: 'No household' }, { status: 400 })

  // Token valid for 7 days
  const token = Buffer.from(
    JSON.stringify({ household_id, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 })
  ).toString('base64')

  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  return NextResponse.json({ invite_url: `${base}/register?invite=${token}` })
}
