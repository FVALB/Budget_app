import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { z } from 'zod'

const schema = z.object({
  email: z.email(),
  password: z.string().min(8),
  household_name: z.string().min(1).optional(),
  invite_token: z.string().optional(),
})

// Default categories to seed on first registration
const DEFAULT_CATEGORIES = [
  { name: 'Income',              color: '#16A34A', sort_order: 1,  parent: null,
    children: [
      { name: 'Salary',                    color: '#16A34A', sort_order: 1 },
      { name: 'Benefits & Reimbursements', color: '#16A34A', sort_order: 2 },
      { name: 'Tax Refunds',               color: '#16A34A', sort_order: 3 },
      { name: 'Other Income',              color: '#16A34A', sort_order: 4 },
    ]},
  { name: 'Housing',             color: '#1E40AF', sort_order: 2,  parent: null,
    children: [
      { name: 'Rent (ICF La Sablière)',    color: '#1E40AF', sort_order: 1 },
      { name: 'Energy (Mint Énergie)',     color: '#1E40AF', sort_order: 2 },
      { name: 'Insurance (BPCE Vie)',      color: '#1E40AF', sort_order: 3 },
    ]},
  { name: 'Education',           color: '#7C3AED', sort_order: 3,  parent: null,
    children: [
      { name: 'School Fees (Montessori)', color: '#7C3AED', sort_order: 1 },
      { name: 'Driving Lessons (Ornikar)',color: '#7C3AED', sort_order: 2 },
    ]},
  { name: 'Subscriptions',       color: '#0891B2', sort_order: 4,  parent: null,
    children: [
      { name: 'Internet (Free Telecom)', color: '#0891B2', sort_order: 1 },
      { name: 'Mobile (Free Mobile)',    color: '#0891B2', sort_order: 2 },
      { name: 'Netflix',                 color: '#0891B2', sort_order: 3 },
      { name: 'Revolut Metal',           color: '#0891B2', sort_order: 4 },
      { name: 'Claude / Anthropic',      color: '#0891B2', sort_order: 5 },
    ]},
  { name: 'Transport',           color: '#D97706', sort_order: 5,  parent: null,
    children: [
      { name: 'Fuel (TotalEnergies)',     color: '#D97706', sort_order: 1 },
      { name: 'Public Transport (RATP)', color: '#D97706', sort_order: 2 },
      { name: 'Parking',                 color: '#D97706', sort_order: 3 },
    ]},
  { name: 'Groceries',           color: '#15803D', sort_order: 6,  parent: null, children: [] },
  { name: 'Restaurants & Dining',color: '#EA580C', sort_order: 7,  parent: null, children: [] },
  { name: 'Shopping',            color: '#DB2777', sort_order: 8,  parent: null, children: [] },
  { name: 'Health & Pharmacy',   color: '#DC2626', sort_order: 9,  parent: null, children: [] },
  { name: 'Remittances',         color: '#92400E', sort_order: 10, parent: null,
    children: [
      { name: 'taptap send', color: '#92400E', sort_order: 1 },
    ]},
  { name: 'Savings',             color: '#0D9488', sort_order: 11, parent: null, children: [] },
  { name: 'Misc',                color: '#64748B', sort_order: 12, parent: null, children: [] },
]

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { email, password, household_name, invite_token } = parsed.data
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error('Environment variables missing:', {
      url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    })
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  const supabase = await createClient()
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // ── Invite flow: decode token to get household_id ──────────────────────
  let household_id: string | null = null

  if (invite_token) {
    // Tokens are base64-encoded JSON: { household_id, exp }
    try {
      const decoded = JSON.parse(Buffer.from(invite_token, 'base64').toString('utf-8'))
      if (decoded.exp < Date.now()) {
        return NextResponse.json({ error: 'Invite link has expired' }, { status: 400 })
      }
      household_id = decoded.household_id
    } catch {
      return NextResponse.json({ error: 'Invalid invite token' }, { status: 400 })
    }
  }

  console.log('Registering user:', email)
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: household_id ? { household_id } : {},
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  })

  if (authError || !authData.user) {
    console.error('Auth error:', authError)
    return NextResponse.json({ error: authError?.message ?? 'Sign up failed' }, { status: 400 })
  }
  console.log('Auth success, user ID:', authData.user.id)

  // ── If this is the first user (not invite), create household + seed ────
  if (!household_id) {
    // Create household
    const { data: hh, error: hhErr } = await admin
      .from('households')
      .insert({ name: household_name! })
      .select()
      .single()

    if (hhErr || !hh) {
      console.error('Household creation error:', hhErr)
      return NextResponse.json({ error: hhErr?.message ?? 'Failed to create household' }, { status: 500 })
    }
    household_id = hh.id

    // Update user metadata with household_id
    const { error: updateError } = await admin.auth.admin.updateUserById(
      authData.user.id,
      { user_metadata: { household_id } }
    )
    if (updateError) {
      console.error('Update user error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Create 3 default accounts
    await admin.from('accounts').insert([
      { household_id, name: 'BP Checking',      bank: 'banque_populaire', account_type: 'checking',  currency: 'EUR' },
      { household_id, name: 'Revolut Personal', bank: 'revolut',          account_type: 'personal',  currency: 'EUR' },
      { household_id, name: 'Revolut Joint',    bank: 'revolut',          account_type: 'joint',     currency: 'EUR' },
    ])

    // Seed categories (parent → children in two passes)
    for (const cat of DEFAULT_CATEGORIES) {
      const { data: parent } = await admin
        .from('categories')
        .insert({ household_id, name: cat.name, color: cat.color, sort_order: cat.sort_order })
        .select()
        .single()

      if (parent && cat.children && cat.children.length > 0) {
        await admin.from('categories').insert(
          cat.children.map((c) => ({
            household_id,
            name: c.name,
            color: c.color,
            sort_order: c.sort_order,
            parent_id: parent.id,
          }))
        )
      }
    }
  }

  return NextResponse.json({ ok: true })
}
