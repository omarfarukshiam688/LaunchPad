import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authErrorMessage } from '../lib/auth-errors'
import { Button } from '../components/ui/Button'
import { Field, TextInput } from '../components/ui/FormFields'
import { IconAlert, IconCheck, IconEye, IconEyeOff, IconLock } from '../components/ui/Icons'
import { LogoMark } from '../components/ui/Logo'

const MIN_PASSWORD_LENGTH = 8

export function ResetPasswordPage() {
  const { session, loading, configError, updatePassword } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  if (configError) {
    return <Navigate to="/login" replace />
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <span className="inline-block h-8 w-8 animate-spin rounded-full border-[3px] border-border-strong border-r-accent" />
      </div>
    )
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
        <div className="animate-fade-in w-full max-w-sm rounded-2xl border border-border bg-surface p-8 text-center shadow-xl shadow-black/10">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
            <IconCheck size={22} />
          </span>
          <h1 className="mt-4 text-lg font-semibold tracking-tight text-ink">
            Password updated
          </h1>
          <p className="mt-1.5 text-sm text-ink-2">
            Your password was changed successfully.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-flex h-10 items-center justify-center rounded-lg bg-accent px-4 text-sm font-medium text-accent-ink transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
        <div className="animate-fade-in w-full max-w-sm rounded-2xl border border-border bg-surface p-8 text-center shadow-xl shadow-black/10">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-danger">
            <IconAlert size={22} />
          </span>
          <h1 className="mt-4 text-lg font-semibold tracking-tight text-ink">
            Link expired or invalid
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-2">
            This password reset link is no longer valid. Request a new one and
            use the latest email you received.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-flex h-10 items-center justify-center rounded-lg bg-accent px-4 text-sm font-medium text-accent-ink transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            Request a new link
          </Link>
        </div>
      </div>
    )
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setFormError(null)

    if (password.length < MIN_PASSWORD_LENGTH) {
      setFormError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }
    if (password !== confirm) {
      setFormError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    const { error } = await updatePassword(password)
    setSubmitting(false)

    if (error) {
      setFormError(authErrorMessage(error))
      return
    }
    setSuccess(true)
  }

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <div className="flex h-16 items-center justify-center">
        <LogoMark size={26} />
      </div>
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="animate-fade-in w-full max-w-sm rounded-2xl border border-border bg-surface p-7 shadow-xl shadow-black/10 sm:p-8">
          <div className="mb-6 text-center">
            <h1 className="text-xl font-bold tracking-tight text-ink">
              Set a new password
            </h1>
            <p className="mt-1.5 text-sm text-ink-2">
              Choose a strong password for your account.
            </p>
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

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <Field label="New password" htmlFor="new-password">
              <div className="relative">
                <IconLock
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"
                />
                <TextInput
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="pr-10 pl-9"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-ink-3 transition-colors hover:text-ink"
                >
                  {showPassword ? (
                    <IconEyeOff size={15} />
                  ) : (
                    <IconEye size={15} />
                  )}
                </button>
              </div>
            </Field>

            <Field label="Confirm password" htmlFor="confirm-password">
              <TextInput
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Repeat your password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
              />
            </Field>

            <Button
              type="submit"
              loading={submitting}
              loadingLabel="Updating password…"
              className="w-full"
            >
              Update password
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
