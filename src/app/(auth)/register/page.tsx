import { RegisterForm } from '@/features/auth/components/RegisterForm'

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-muted p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Create account</h1>
          <p className="mt-1 text-sm text-muted-foreground">Set up your household budget</p>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <RegisterForm />
        </div>
      </div>
    </div>
  )
}
