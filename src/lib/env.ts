export interface SupabaseConfig {
  url: string
  key: string
}

function readPublicValue(value: string | undefined): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

function isSecretFormatKey(key: string): boolean {
  return key.startsWith('sb_secret_') || key.startsWith('service_role')
}

export class SupabaseConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SupabaseConfigError'
  }
}

export function getSupabaseConfig(): SupabaseConfig {
  // Explicit, statically-scoped access to exactly the two public
  // variables this app requires. Vite replaces each
  // `import.meta.env.<NAME>` expression with its literal value at
  // build time, so only these two values ever enter the bundle.
  // Dynamic access such as `import.meta.env[name]` forces Vite to
  // inline every VITE_* variable — including secrets — which is why
  // it must never be used here.
  const url = readPublicValue(import.meta.env.VITE_SUPABASE_URL)
  if (!url) {
    throw new SupabaseConfigError(
      'Missing required environment variable VITE_SUPABASE_URL. Set it to your own Supabase project URL (Supabase Dashboard > Project Settings > General > Project URL), e.g. https://your-project-ref.supabase.co. See .env.example for details.'
    )
  }
  if (!isHttpUrl(url)) {
    throw new SupabaseConfigError(
      `Invalid VITE_SUPABASE_URL: it must be a valid http(s) URL pointing at your own Supabase project, e.g. https://your-project-ref.supabase.co.`
    )
  }

  const publishableKey = readPublicValue(
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  )
  if (!publishableKey) {
    throw new SupabaseConfigError(
      'Missing required environment variable VITE_SUPABASE_PUBLISHABLE_KEY. Set it to the publishable key (starts with sb_publishable_) from Supabase Dashboard > Project Settings > API. See .env.example for details.'
    )
  }
  if (isSecretFormatKey(publishableKey)) {
    throw new SupabaseConfigError(
      'VITE_SUPABASE_PUBLISHABLE_KEY contains a secret-format key. Secret/service_role keys must never be placed in any VITE_ variable — Vite embeds every VITE_ variable into the client bundle, which would expose the secret to anyone who loads the site. Use the publishable key from Supabase Dashboard > Project Settings > API.'
    )
  }

  return { url, key: publishableKey }
}
