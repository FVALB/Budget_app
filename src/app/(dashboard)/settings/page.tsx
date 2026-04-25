import { getAccounts } from '@/server/db/accounts'
import { getCategories } from '@/server/db/categories'
import { getHousehold } from '@/server/db/households'
import { SettingsClient } from './SettingsClient'

export default async function SettingsPage() {
  const [accounts, categories, household] = await Promise.all([
    getAccounts(),
    getCategories(),
    getHousehold(),
  ])

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage accounts, categories, and household preferences.</p>
      </div>
      <SettingsClient
        initialAccounts={accounts}
        initialCategories={categories}
        household={household}
      />
    </div>
  )
}
