import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react'

const baseFieldClasses =
  'w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink placeholder:text-ink-3 transition-colors duration-150 hover:border-border-strong focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus'

export interface FieldProps {
  label: string
  htmlFor: string
  error?: string | null
  hint?: string | null
  children: React.ReactNode
}

export function Field({ label, htmlFor, error, hint, children }: FieldProps) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-[13px] font-medium text-ink"
      >
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 text-[13px] text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-[13px] text-ink-3">{hint}</p>
      ) : null}
    </div>
  )
}

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  function TextInput({ invalid, className = '', ...props }, ref) {
    return (
      <input
        ref={ref}
        className={`${baseFieldClasses} h-10 ${invalid ? 'border-danger/60 focus-visible:border-danger' : ''} ${className}`}
        aria-invalid={invalid || undefined}
        {...props}
      />
    )
  }
)

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  function TextArea({ invalid, className = '', ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={`${baseFieldClasses} min-h-20 resize-y py-2.5 ${invalid ? 'border-danger/60 focus-visible:border-danger' : ''} ${className}`}
        aria-invalid={invalid || undefined}
        {...props}
      />
    )
  }
)
