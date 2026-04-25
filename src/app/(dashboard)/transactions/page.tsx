import { getTransactions } from '@/server/db/transactions'
import { getAccounts } from '@/server/db/accounts'
import { getCategories } from '@/server/db/categories'
import { TransactionsClient } from './TransactionsClient'

export default async function TransactionsPage() {
  const [transactions, accounts, categories] = await Promise.all([
    getTransactions({ include_transfers: false }),
    getAccounts(),
    getCategories(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
        <p className="text-sm text-muted-foreground">{transactions.length} transactions</p>
      </div>

      <TransactionsClient
        initialTransactions={transactions}
        accounts={accounts}
        categories={categories}
      />
    </div>
  )
}
