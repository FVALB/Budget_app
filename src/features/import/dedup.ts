// Duplicate transaction detection using a sha256 hash per transaction.
// import_hash = sha256(account_id + date + description + amount_cents)
// Also detects duplicate file uploads via file_hash.

import { createHash } from 'crypto'
import type { RawTransaction } from './parsers/parser.types'

export function computeImportHash(
  account_id: string,
  tx: Pick<RawTransaction, 'date' | 'description' | 'amount_cents'>
): string {
  const input = [account_id, tx.date, tx.description, String(tx.amount_cents)].join('|')
  return createHash('sha256').update(input).digest('hex')
}

export function computeFileHash(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex')
}

export function deduplicateTransactions(
  account_id: string,
  transactions: RawTransaction[],
  existingHashes: Set<string>
): {
  new_transactions: Array<RawTransaction & { import_hash: string; is_duplicate: false }>
  duplicates: Array<RawTransaction & { import_hash: string; is_duplicate: true }>
} {
  const new_transactions: Array<RawTransaction & { import_hash: string; is_duplicate: false }> = []
  const duplicates: Array<RawTransaction & { import_hash: string; is_duplicate: true }> = []
  const seenThisImport = new Set<string>()

  for (const tx of transactions) {
    const hash = computeImportHash(account_id, tx)

    if (existingHashes.has(hash) || seenThisImport.has(hash)) {
      duplicates.push({ ...tx, import_hash: hash, is_duplicate: true })
    } else {
      seenThisImport.add(hash)
      new_transactions.push({ ...tx, import_hash: hash, is_duplicate: false })
    }
  }

  return { new_transactions, duplicates }
}
