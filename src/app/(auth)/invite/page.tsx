import { RegisterForm } from '@/features/auth/components/RegisterForm'

export default async function InvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-muted-foreground">Invalid invite link.</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-muted p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Join household</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            You have been invited to join a shared budget
          </p>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <RegisterForm inviteToken={token} />
        </div>
      </div>
    </div>
  )
}
