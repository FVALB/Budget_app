'use client'

import { useState, useEffect } from 'react'
import { UploadDropzone } from '@/features/import/components/UploadDropzone'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { formatCents } from '@/lib/currency'
import { formatShortDate } from '@/lib/date'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Account } from '@/types/app'

interface ParsedTx {
  date: string
  description: string
  amount_cents: number
  import_hash: string
  is_transfer: boolean
  transfer_label?: string
  is_duplicate: boolean
  category_id: string | null
  include: boolean
}

export default function ImportPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [accountId, setAccountId] = useState('')
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<{
    transactions: ParsedTx[]
    file_hash: string
    filename: string
    duplicate_count: number
    transfer_count: number
    warnings: string[]
  } | null>(null)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    fetch('/api/accounts')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setAccounts(data) })
      .catch(() => {})
  }, [])

  async function handleFile(file: File) {
    if (!accountId) {
      toast.error('Select an account before uploading.')
      return
    }
    setLoading(true)
    setPreview(null)

    const form = new FormData()
    form.append('file', file)
    form.append('account_id', accountId)

    const res = await fetch('/api/import', { method: 'POST', body: form })
    const data = await res.json()
    setLoading(false)

    if (data.status === 'duplicate_file') {
      toast.error(data.message)
      return
    }

    if (!res.ok) {
      toast.error(data.error ?? 'Import failed')
      return
    }

    const txs: ParsedTx[] = data.new_transactions.map((tx: Omit<ParsedTx, 'include'>) => ({
      ...tx,
      include: true,
    }))

    setPreview({
      transactions: txs,
      file_hash: data.file_hash,
      filename: data.filename,
      duplicate_count: data.duplicate_count,
      transfer_count: data.transfer_count,
      warnings: data.warnings,
    })
  }

  async function handleConfirm() {
    if (!preview) return
    setConfirming(true)

    const toInsert = preview.transactions.filter((t) => t.include && !t.is_duplicate)

    const res = await fetch('/api/import/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        account_id: accountId,
        file_hash: preview.file_hash,
        filename: preview.filename,
        transactions: toInsert,
      }),
    })

    const data = await res.json()
    setConfirming(false)

    if (!res.ok) {
      toast.error(data.error ?? 'Failed to save')
      return
    }

    toast.success(`Imported ${data.inserted} transactions successfully.`)
    setPreview(null)
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Import Statement</h1>
        <p className="text-sm text-muted-foreground">
          Upload a bank PDF to import transactions.
        </p>
      </div>

      {/* Account selector */}
      <div className="flex items-center gap-4">
        <div className="w-56">
          <Select
            value={accountId}
            onValueChange={(v) => { if (v) setAccountId(v) }}
            items={accounts.map(a => ({ value: a.id, label: a.name }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select account…" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground">
          Select the account this PDF belongs to before uploading.
        </p>
      </div>

      {/* Upload zone */}
      <UploadDropzone onFile={handleFile} disabled={loading || !accountId} />

      {loading && (
        <div className="text-center text-sm text-muted-foreground animate-pulse">
          Parsing PDF…
        </div>
      )}

      {/* Preview table */}
      {preview && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="flex flex-wrap gap-3 text-sm">
            <Badge variant="secondary">{preview.transactions.filter((t) => t.include).length} new</Badge>
            {preview.duplicate_count > 0 && (
              <Badge variant="outline" className="text-muted-foreground">
                {preview.duplicate_count} already imported (skipped)
              </Badge>
            )}
            {preview.transfer_count > 0 && (
              <Badge variant="outline" className="text-muted-foreground">
                {preview.transfer_count} transfers (excluded from budget)
              </Badge>
            )}
            {preview.warnings.length > 0 && (
              <Badge variant="destructive">{preview.warnings.length} parser warning(s)</Badge>
            )}
          </div>

          {/* Transaction rows */}
          <div className="rounded-xl border overflow-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="p-3 text-left font-medium text-muted-foreground">Include</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Date</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Description</th>
                  <th className="p-3 text-right font-medium text-muted-foreground">Amount</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {preview.transactions.map((tx, i) => (
                  <tr
                    key={tx.import_hash}
                    className={cn(
                      tx.is_transfer ? 'opacity-60 bg-muted/20' : '',
                      !tx.include ? 'opacity-40 line-through' : ''
                    )}
                  >
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={tx.include}
                        onChange={(e) => {
                          const updated = [...preview.transactions]
                          updated[i] = { ...tx, include: e.target.checked }
                          setPreview({ ...preview, transactions: updated })
                        }}
                        className="h-4 w-4"
                      />
                    </td>
                    <td className="p-3 whitespace-nowrap text-muted-foreground">
                      {formatShortDate(tx.date)}
                    </td>
                    <td className="p-3 max-w-xs truncate">{tx.description}</td>
                    <td className={cn(
                      'amount p-3 text-right font-medium whitespace-nowrap',
                      tx.amount_cents > 0 ? 'amount-positive' : 'amount-negative'
                    )}>
                      {tx.amount_cents > 0 ? '+' : ''}{formatCents(tx.amount_cents)}
                    </td>
                    <td className="p-3">
                      {tx.is_transfer && (
                        <Badge variant="outline" className="text-xs">Transfer</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setPreview(null)}>Cancel</Button>
            <Button onClick={handleConfirm} disabled={confirming}>
              {confirming ? 'Importing…' : `Import ${preview.transactions.filter((t) => t.include).length} transactions`}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
