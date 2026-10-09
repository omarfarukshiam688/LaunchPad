import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseConfig, SupabaseConfigError } from '../env'
import type { Database } from '../database.types'

let client: SupabaseClient<Database> | null = null
let configError: SupabaseConfigError | null = null

try {
  const config = getSupabaseConfig()
  client = createClient<Database>(config.url, config.key, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  })
} catch (error) {
  configError =
    error instanceof SupabaseConfigError
      ? error
      : new SupabaseConfigError(
          'Launchpad could not initialize the Supabase client. Check your environment variables and reload the page.'
        )
}

export function getSupabase(): SupabaseClient<Database> {
  if (!client) {
    throw configError ?? new SupabaseConfigError('Supabase client is not configured.')
  }
  return client
}

export function getSupabaseConfigError(): SupabaseConfigError | null {
  return configError
}
