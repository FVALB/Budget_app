import { NextResponse } from 'next/server'
import { getAccounts } from '@/server/db/accounts'

export async function GET() {
  const accounts = await getAccounts()
  return NextResponse.json(accounts)
}
