import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authErrorMessage } from '../lib/auth-errors'
import { Button } from '../components/ui/Button'
import { Field, TextInput } from '../components/ui/FormFields'
import { Logo, LogoMark } from '../components/ui/Logo'
import { IconAlert, IconCheck, IconEye, IconEyeOff, IconLock, IconMail } from '../components/ui/Icons'

type Mode = 'sign-in' | 'sign-up'

interface LocationState {
  from?: { pathname: string }
}

export function LoginPage() {
  const { session, loading, configError, signIn, signUp } = useAuth()
  const [mode, setMode] = useState<Mode>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [signUpNotice, setSignUpNotice] = useState<string | null>(null)
  const location = useLocation()

  const redirectPath =
    (location.state as LocationState | null)?.from?.pathname ?? '/'

  useEffect(() => {
    setFormError(null)
    setSignUpNotice(null)
  }, [mode])

  if (configError) {
    return <ConfigurationError error={configError} />
  }

  if (loading) {
    return <FullPageLoader />
  }

  if (session) {
    return <Navigate to={redirectPath} replace />
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setFormError(null)
    setSignUpNotice(null)

    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setFormError('Enter your email address.')
      return
    }
    if (password.length < 8) {
      setFormError('Password must be at least 8 characters.')
      return
    }

    setSubmitting(true)
    try {
      if (mode === 'sign-in') {
        const { error } = await signIn(trimmedEmail, password)
        if (error) {
          setFormError(authErrorMessage(error))
        }
      } else {
        const { error, needsEmailConfirmation } = await signUp(
          trimmedEmail,
          password
        )
        if (error) {
          setFormError(authErrorMessage(error))
        } else if (needsEmailConfirmation) {
          setSignUpNotice(
            `We sent a confirmation link to ${trimmedEmail}. Open it to activate your account, then sign in.`
          )
        }
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <div className="flex h-16 items-center px-4 sm:px-6">
        <Logo size={26} />
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="animate-fade-in w-full max-w-md">
          <div className="rounded-2xl border border-border bg-surface p-7 shadow-xl shadow-black/10 sm:p-8">
            <div className="mb-7 text-center">
              <span className="inline-flex">
                <LogoMark size={44} />
              </span>
              <h1 className="mt-4 text-xl font-bold tracking-tight text-ink">
                Welcome to Launchpad
              </h1>
              <p className="mt-1.5 text-sm text-ink-2">
                {mode === 'sign-in'
                  ? 'Sign in to open your projects.'
                  : 'Create your personal project launcher.'}
              </p>
            </div>

            <div
              role="tablist"
              aria-label="Authentication mode"
              className="mb-6 grid grid-cols-2 gap-1 rounded-lg border border-border bg-surface-2 p-1"
            >
              {(['sign-in', 'sign-up'] as Mode[]).map((candidate) => (
                <button
                  key={candidate}
                  type="button"
                  role="tab"
                  aria-selected={mode === candidate}
                  onClick={() => setMode(candidate)}
                  className={`h-9 rounded-md text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
                    mode === candidate
                      ? 'bg-surface text-ink shadow-sm'
                      : 'text-ink-2 hover:text-ink'
                  }`}
                >
                  {candidate === 'sign-in' ? 'Sign in' : 'Sign up'}
                </button>
              ))}
            </div>

            {formError ? (
              <div
                role="alert"
                className="mb-5 flex items-start gap-2.5 rounded-lg border border-danger/30 bg-danger/10 px-3.5 py-3 text-[13px] text-danger"
              >
                <IconAlert size={16} className="mt-0.5 shrink-0" />
                <span>{formError}</span>
              </div>
            ) : null}

            {signUpNotice ? (
              <div
                role="status"
                className="mb-5 flex items-start gap-2.5 rounded-lg border border-accent/30 bg-accent-soft px-3.5 py-3 text-[13px] text-ink"
              >
                <IconCheck size={16} className="mt-0.5 shrink-0 text-accent" />
                <span>{signUpNotice}</span>
              </div>
            ) : null}

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <Field label="Email" htmlFor="auth-email">
                <div className="relative">
                  <IconMail
                    size={15}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"
                  />
                  <TextInput
                    id="auth-email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="pl-9"
                    autoFocus
                  />
                </div>
              </Field>

              <Field label="Password" htmlFor="auth-password">
                <div className="relative">
                  <IconLock
                    size={15}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"
                  />
                  <TextInput
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={
                      mode === 'sign-in'
                        ? 'current-password'
                        : 'new-password'
                    }
                    placeholder="Enter your password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="pr-10 pl-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-ink-3 transition-colors hover:text-ink"
                  >
                    {showPassword ? <IconEyeOff size={15} /> : <IconEye size={15} />}
                  </button>
                </div>
              </Field>

              <Button
                type="submit"
                loading={submitting}
                loadingLabel={
                  mode === 'sign-in' ? 'Signing in…' : 'Creating account…'
                }
                className="w-full"
              >
                {mode === 'sign-in' ? 'Sign in' : 'Create account'}
              </Button>
            </form>

            {mode === 'sign-in' ? (
              <p className="mt-5 text-center text-[13px] text-ink-3">
                Forgot your password?{' '}
                <a
                  href="/reset-password"
                  className="font-medium text-accent hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                >
                  Reset it here
                </a>
                .
              </p>
            ) : (
              <p className="mt-5 text-center text-xs leading-relaxed text-ink-3">
                If email confirmation is enabled on this instance, we&apos;ll
                email you a link to verify your account before you can sign in.
              </p>
            )}
          </div>

          <p className="mt-6 text-center text-xs text-ink-3">
            Self-hosted and open source. Your data stays in your Supabase
            project.
          </p>
        </div>
      </div>
    </div>
  )
}

function FullPageLoader() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas">
      <span className="inline-block h-8 w-8 animate-spin rounded-full border-[3px] border-border-strong border-r-accent" />
      <p className="text-sm text-ink-2">Loading Launchpad…</p>
    </div>
  )
}

function ConfigurationError({ error }: { error: Error }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-lg rounded-2xl border border-danger/30 bg-surface p-8 text-center shadow-xl shadow-black/10">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-danger">
          <IconAlert size={22} />
        </span>
        <h1 className="mt-4 text-lg font-semibold tracking-tight text-ink">
          Configuration required
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-2">
          This Launchpad instance isn&apos;t connected to a Supabase project
          yet.
        </p>
        <div className="mt-5 rounded-xl border border-border bg-surface-2/60 px-4 py-3 text-left">
          <p className="text-[13px] font-medium text-ink">
            What to do:
          </p>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-[13px] text-ink-2">
            <li>Copy <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs">.env.example</code> to <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs">.env.local</code></li>
            <li>Add your own Supabase URL and publishable key from{' '}
              <span className="font-medium">Project Settings &gt; API</span>
            </li>
            <li>Run the migration in <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs">supabase/migrations/</code>, then restart the dev server</li>
          </ol>
        </div>
        <p className="mt-5 text-[13px] text-danger">{error.message}</p>
      </div>
    </div>
  )
}
