import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || ''
  if (url.endsWith('/')) url = url.slice(0, -1)

  return createBrowserClient(
    url,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || ''
  )
}
