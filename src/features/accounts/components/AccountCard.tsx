'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import type { Account } from '@/types/app'

const BANK_LABELS: Record<string, string> = {
  banque_populaire: 'Banque Populaire',
  revolut: 'Revolut',
}

const TYPE_LABELS: Record<string, string> = {
  checking: 'Checking',
  personal: 'Personal',
  joint: 'Joint',
}

interface Props {
  account: Account
  onUpdate: (updated: Account) => void
}

export function AccountCard({ account, onUpdate }: Props) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(account.name)
  const [loading, setLoading] = useState(false)

  async function save() {
    if (name.trim() === account.name) { setEditing(false); return }
    setLoading(true)
    const res = await fetch(`/api/accounts/${account.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() }),
    })
    setLoading(false)
    if (!res.ok) { toast.error('Failed to save'); setName(account.name); return }
    onUpdate({ ...account, name: name.trim() })
    setEditing(false)
    toast.success('Account renamed')
  }

  return (
    <div className="rounded-xl border bg-card p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="min-w-0">
          {editing ? (
            <Input
              className="h-8 text-sm w-48"
              value={name}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              onBlur={save}
              onKeyDown={(e) => {
                if (e.key === 'Enter') save()
                if (e.key === 'Escape') { setName(account.name); setEditing(false) }
              }}
            />
          ) : (
            <p className="font-medium text-sm truncate">{account.name}</p>
          )}
          <div className="flex items-center gap-1.5 mt-1">
            <Badge variant="outline" className="text-xs">{BANK_LABELS[account.bank]}</Badge>
            <Badge variant="outline" className="text-xs">{TYPE_LABELS[account.account_type]}</Badge>
            <Badge variant="outline" className="text-xs">{account.currency}</Badge>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {editing ? (
          <>
            <Button size="sm" onClick={save} disabled={loading} className="h-7 px-2 text-xs">Save</Button>
            <Button size="sm" variant="ghost" onClick={() => { setName(account.name); setEditing(false) }} className="h-7 px-2 text-xs">
              Cancel
            </Button>
          </>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="h-7 px-2 text-xs">
            Rename
          </Button>
        )}
      </div>
    </div>
  )
}
