'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AccountCard } from '@/features/accounts/components/AccountCard'
import { CategoryManager } from '@/features/categories/components/CategoryManager'
import { toast } from 'sonner'
import { formatCents } from '@/lib/currency'
import type { Account, Category, Household } from '@/types/app'

interface Props {
  initialAccounts: Account[]
  initialCategories: Category[]
  household: Household | null
}

function AccountsTab({ initialAccounts }: { initialAccounts: Account[] }) {
  const [accounts, setAccounts] = useState(initialAccounts)

  return (
    <div className="space-y-3">
      {accounts.map((account) => (
        <AccountCard
          key={account.id}
          account={account}
          onUpdate={(updated) =>
            setAccounts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
          }
        />
      ))}
      <p className="text-xs text-muted-foreground pt-2">
        Accounts are created automatically during registration. Contact support to add a new account.
      </p>
    </div>
  )
}

function HouseholdTab({ household }: { household: Household | null }) {
  const [threshold, setThreshold] = useState(
    household ? Math.round(household.safety_threshold_cents / 100).toString() : '300'
  )
  const [savingThreshold, setSavingThreshold] = useState(false)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [generatingInvite, setGeneratingInvite] = useState(false)

  async function saveThreshold() {
    const cents = Math.round(parseFloat(threshold) * 100)
    if (isNaN(cents) || cents < 0) { toast.error('Invalid amount'); return }
    setSavingThreshold(true)
    const res = await fetch('/api/household', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ safety_threshold_cents: cents }),
    })
    setSavingThreshold(false)
    if (!res.ok) { toast.error('Failed to save'); return }
    toast.success(`Safety threshold set to ${formatCents(cents)}`)
  }

  async function generateInvite() {
    setGeneratingInvite(true)
    const res = await fetch('/api/invite', { method: 'POST' })
    setGeneratingInvite(false)
    if (!res.ok) { toast.error('Failed to generate invite'); return }
    const data = await res.json()
    setInviteUrl(data.invite_url)
  }

  async function copyInvite() {
    if (!inviteUrl) return
    await navigator.clipboard.writeText(inviteUrl)
    toast.success('Invite link copied to clipboard')
  }

  return (
    <div className="space-y-8">
      {/* Safety threshold */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold">Safety Threshold</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            The "Safe to Spend" card turns red when your projected balance drops below this amount.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="threshold" className="text-sm text-muted-foreground">€</Label>
            <Input
              id="threshold"
              type="number"
              min="0"
              step="10"
              className="w-28 h-8 text-sm"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
            />
          </div>
          <Button size="sm" onClick={saveThreshold} disabled={savingThreshold} className="h-8">
            {savingThreshold ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Invite partner */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold">Invite Partner</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Generate a link for your partner to join this household. The link expires in 7 days.
          </p>
        </div>
        {inviteUrl ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={inviteUrl}
                className="h-8 text-xs font-mono flex-1"
              />
              <Button size="sm" variant="outline" onClick={copyInvite} className="h-8 shrink-0">
                Copy
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Share this link with your partner. They will be asked to create a password.
            </p>
          </div>
        ) : (
          <Button size="sm" variant="outline" onClick={generateInvite} disabled={generatingInvite}>
            {generatingInvite ? 'Generating…' : 'Generate invite link'}
          </Button>
        )}
      </div>
    </div>
  )
}

export function SettingsClient({ initialAccounts, initialCategories, household }: Props) {
  return (
    <Tabs defaultValue="categories">
      <TabsList>
        <TabsTrigger value="categories">Categories</TabsTrigger>
        <TabsTrigger value="accounts">Accounts</TabsTrigger>
        <TabsTrigger value="household">Household</TabsTrigger>
      </TabsList>

      <TabsContent value="categories" className="mt-6">
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Double-click a name to rename. Click the colored dot to change its color. Subcategories are indented.
          </p>
          <div className="rounded-xl border bg-card p-2">
            <CategoryManager initialCategories={initialCategories} />
          </div>
        </div>
      </TabsContent>

      <TabsContent value="accounts" className="mt-6">
        <AccountsTab initialAccounts={initialAccounts} />
      </TabsContent>

      <TabsContent value="household" className="mt-6">
        <HouseholdTab household={household} />
      </TabsContent>
    </Tabs>
  )
}
