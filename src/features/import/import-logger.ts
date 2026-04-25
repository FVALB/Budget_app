import logger from '@/lib/logger'
import type { ImportLog } from '@/types/app'

export function logImportComplete(log: Omit<ImportLog, 'id' | 'account'>) {
  logger.info({
    event: 'import_complete',
    account_id: log.account_id,
    filename: log.filename,
    file_hash: log.file_hash,
    total_parsed: log.total_parsed,
    inserted: log.inserted,
    duplicates_skipped: log.duplicates_skipped,
    transfers_flagged: log.transfers_flagged,
    status: log.status,
  })
}

export function logImportDuplicateFile(filename: string, file_hash: string, first_imported_at: string) {
  logger.warn({
    event: 'import_duplicate_file',
    filename,
    file_hash,
    first_imported_at,
    message: 'This file was already imported — skipped.',
  })
}

export function logImportError(filename: string, error: unknown) {
  logger.error({
    event: 'import_error',
    filename,
    error: error instanceof Error ? error.message : String(error),
  })
}
