import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseBanquePopulairePDF } from '@/features/import/parsers/bp-parser'
import { parseRevolutPDF } from '@/features/import/parsers/revolut-parser'
import { flagTransfers } from '@/features/import/transfer-detector'
import { computeFileHash, deduplicateTransactions } from '@/features/import/dedup'
import { logImportDuplicateFile, logImportError } from '@/features/import/import-logger'
import { getImportHashes } from '@/server/db/transactions'
import { getAccount } from '@/server/db/accounts'

async function extractPDFText(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import('pdf-parse')
  const parser = new PDFParse({ data: new Uint8Array(buffer) })
  const result = await parser.getText()
  await parser.destroy()
  return result.text
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  const account_id = formData.get('account_id') as string | null

  if (!file || !account_id) {
    return NextResponse.json({ error: 'Missing file or account_id' }, { status: 400 })
  }

  const account = await getAccount(account_id)
  if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const file_hash = computeFileHash(buffer)

  // ── Duplicate file check ───────────────────────────────────────────────
  const { data: existingLog } = await supabase
    .from('import_logs')
    .select('imported_at')
    .eq('file_hash', file_hash)
    .single()

  if (existingLog) {
    logImportDuplicateFile(file.name, file_hash, existingLog.imported_at)
    return NextResponse.json({
      status: 'duplicate_file',
      first_imported_at: existingLog.imported_at,
      message: `This statement was already imported on ${new Date(existingLog.imported_at).toLocaleDateString('fr-FR')}.`,
    })
  }

  // ── Parse PDF ─────────────────────────────────────────────────────────
  let text: string
  try {
    text = await extractPDFText(buffer)
  } catch (err) {
    logImportError(file.name, err)
    const detail = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `Failed to read PDF: ${detail}` }, { status: 422 })
  }

  const parseResult =
    account.bank === 'banque_populaire'
      ? parseBanquePopulairePDF(text)
      : parseRevolutPDF(text)

  // ── Flag transfers ────────────────────────────────────────────────────
  const withTransfers = flagTransfers(parseResult.transactions)
  const transferCount = withTransfers.filter((t) => t.is_transfer).length

  // ── Deduplication ─────────────────────────────────────────────────────
  const existingHashes = await getImportHashes(account_id)
  const { new_transactions, duplicates } = deduplicateTransactions(
    account_id,
    withTransfers,
    existingHashes
  )

  return NextResponse.json({
    status: 'preview',
    account_id,
    file_hash,
    filename: file.name,
    new_transactions,
    duplicate_count: duplicates.length,
    transfer_count: transferCount,
    warnings: parseResult.warnings,
  })
}
