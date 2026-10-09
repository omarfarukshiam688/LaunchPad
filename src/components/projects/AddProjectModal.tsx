import { useEffect, useRef, useState } from 'react'
import { validateProjectImage } from '../../lib/projects'
import type {
  NewProjectInput,
  Project,
  UpdateProjectInput,
} from '../../lib/database.types'
import { Button } from '../ui/Button'
import { Field, TextArea, TextInput } from '../ui/FormFields'
import { IconAlert, IconUpload } from '../ui/Icons'
import { Modal } from '../ui/Modal'

const PLATFORM_SUGGESTIONS = [
  'Vercel',
  'Netlify',
  'Render',
  'GitHub Pages',
  'Cloudflare Pages',
  'Railway',
  'Fly.io',
  'Custom',
]

const MAX_DESCRIPTION_LENGTH = 500

interface FormState {
  name: string
  url: string
  description: string
  platform: string
}

type FormErrors = Partial<Record<keyof FormState | 'image', string>>

function normalizeUrl(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) {
    return trimmed
  }
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) {
    return trimmed
  }
  return `https://${trimmed}`
}

function validateForm(
  form: FormState,
  image: File | null,
  isEdit: boolean
): FormErrors {
  const errors: FormErrors = {}

  const name = form.name.trim()
  if (!name) {
    errors.name = 'Project name is required.'
  } else if (name.length > 80) {
    errors.name = 'Project name must be 80 characters or fewer.'
  }

  const url = normalizeUrl(form.url)
  if (!url) {
    errors.url = 'Project URL is required.'
  } else {
    try {
      const parsed = new URL(url)
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        errors.url = 'URL must start with http:// or https://'
      }
    } catch {
      errors.url = 'Enter a valid URL, e.g. https://my-project.vercel.app'
    }
  }

  if (form.description.length > MAX_DESCRIPTION_LENGTH) {
    errors.description = `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer.`
  }

  if (form.platform.trim().length > 60) {
    errors.platform = 'Platform must be 60 characters or fewer.'
  }

  if (!isEdit && !image) {
    errors.image = 'Upload a project thumbnail.'
  }

  return errors
}

interface AddProjectModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (input: NewProjectInput) => Promise<void>
  onUpdate?: (id: string, input: UpdateProjectInput) => Promise<void>
  project?: Project | null
  imageUrl?: string | null
}

export function AddProjectModal({
  open,
  onClose,
  onSubmit,
  onUpdate,
  project = null,
  imageUrl = null,
}: AddProjectModalProps) {
  const isEdit = Boolean(project)
  const [form, setForm] = useState<FormState>({
    name: '',
    url: '',
    description: '',
    platform: '',
  })
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setForm(
        project
          ? {
              name: project.name,
              url: project.url,
              description: project.description ?? '',
              platform: project.platform ?? '',
            }
          : { name: '', url: '', description: '', platform: '' }
      )
      setImage(null)
      setImagePreview(null)
      setErrors({})
      setSubmitError(null)
      setSubmitting(false)
    }
  }, [open, project])

  useEffect(() => {
    if (!open) {
      setImagePreview((preview) => {
        if (preview) {
          URL.revokeObjectURL(preview)
        }
        return null
      })
      setForm({ name: '', url: '', description: '', platform: '' })
      setImage(null)
      setErrors({})
      setSubmitError(null)
      setSubmitting(false)
    }
  }, [open])

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview)
      }
    }
  }, [imagePreview])

  const platformListId = 'launchpad-platform-suggestions'

  const handleFileChange = (file: File | null) => {
    if (!file) {
      return
    }
    const imageError = validateProjectImage(file)
    if (imageError) {
      setErrors((current) => ({ ...current, image: imageError }))
      return
    }
    setImagePreview((preview) => {
      if (preview) {
        URL.revokeObjectURL(preview)
      }
      return URL.createObjectURL(file)
    })
    setImage(file)
    setErrors((current) => {
      const next = { ...current }
      delete next.image
      return next
    })
  }

  const discardImageReplacement = () => {
    setImage(null)
    setImagePreview((preview) => {
      if (preview) {
        URL.revokeObjectURL(preview)
      }
      return null
    })
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitError(null)

    const validationErrors = validateForm(form, image, isEdit)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) {
      return
    }

    setSubmitting(true)
    try {
      const name = form.name.trim()
      const url = normalizeUrl(form.url)
      const description =
        form.description.trim() === '' ? null : form.description.trim()
      const platform =
        form.platform.trim() === '' ? null : form.platform.trim()

      if (isEdit && project && onUpdate) {
        await onUpdate(project.id, {
          name,
          url,
          description,
          platform,
          image,
        })
      } else {
        await onSubmit({
          name,
          url,
          description,
          platform,
          image: image!,
        })
      }
      onClose()
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : isEdit
            ? 'Could not update the project. Please try again.'
            : 'Could not add the project. Please try again.'
      setSubmitError(message)
    } finally {
      setSubmitting(false)
    }
  }

  const setField =
    <K extends keyof FormState>(field: K) =>
    (value: FormState[K]) => {
      setForm((current) => ({ ...current, [field]: value }))
      setErrors((current) => {
        if (!current[field]) {
          return current
        }
        const next = { ...current }
        delete next[field]
        return next
      })
    }

  const previewSource = imagePreview ?? (isEdit ? imageUrl : null)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit project' : 'Add new project'}
      description={
        isEdit
          ? 'Update the project details. Cancel discards unsaved changes.'
          : 'Save a deployed project so you can open it with one click.'
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        <div className="space-y-5">
          <div>
            <span className="mb-1.5 block text-[13px] font-medium text-ink">
              Project thumbnail
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/avif"
              className="sr-only"
              onChange={(event) => {
                handleFileChange(event.target.files?.[0] ?? null)
                event.target.value = ''
              }}
            />
            {previewSource ? (
              <div className="relative overflow-hidden rounded-xl border border-border bg-surface-2">
                <img
                  src={previewSource}
                  alt={
                    isEdit
                      ? 'Current project thumbnail'
                      : 'Project thumbnail preview'
                  }
                  className="aspect-[16/10] w-full object-cover"
                />
                <button
                  type="button"
                  onClick={discardImageReplacement}
                  className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-lg bg-black/60 text-white backdrop-blur-sm transition-colors hover:bg-black/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                  aria-label={
                    isEdit
                      ? 'Discard new image and keep the current one'
                      : 'Remove image'
                  }
                  title={
                    isEdit
                      ? 'Discard new image and keep the current one'
                      : 'Remove image'
                  }
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    aria-hidden="true"
                  >
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
                {isEdit && !imagePreview ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-2.5 left-2.5 rounded-lg bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                  >
                    Replace image
                  </button>
                ) : null}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border-strong bg-surface-2/50 px-4 py-8 text-ink-3 transition-colors hover:border-accent hover:bg-accent-soft/40 hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                <IconUpload size={22} />
                <span className="text-[13px] font-medium">
                  Click to upload an image
                </span>
                <span className="text-xs text-ink-3">
                  PNG, JPG, WebP, GIF, SVG or AVIF · max 5 MB
                </span>
              </button>
            )}
            {errors.image ? (
              <p className="mt-1.5 text-[13px] text-danger" role="alert">
                {errors.image}
              </p>
            ) : isEdit ? (
              <p className="mt-1.5 text-[13px] text-ink-3">
                Optional. Leave unchanged to keep the current thumbnail.
              </p>
            ) : null}
          </div>

          <Field label="Project name" htmlFor="project-name" error={errors.name}>
            <TextInput
              id="project-name"
              value={form.name}
              onChange={(event) => setField('name')(event.target.value)}
              placeholder="Storefy"
              maxLength={80}
              autoFocus
              invalid={Boolean(errors.name)}
            />
          </Field>

          <Field
            label="Destination URL"
            htmlFor="project-url"
            error={errors.url}
            hint="The link that opens when the card is clicked."
          >
            <TextInput
              id="project-url"
              value={form.url}
              onChange={(event) => setField('url')(event.target.value)}
              placeholder="https://my-project.vercel.app"
              inputMode="url"
              invalid={Boolean(errors.url)}
            />
          </Field>

          <Field
            label="Description"
            htmlFor="project-description"
            error={errors.description}
          >
            <TextArea
              id="project-description"
              value={form.description}
              onChange={(event) => setField('description')(event.target.value)}
              placeholder="What does this project do?"
              maxLength={MAX_DESCRIPTION_LENGTH}
              invalid={Boolean(errors.description)}
            />
          </Field>

          <Field
            label="Hosting platform"
            htmlFor="project-platform"
            error={errors.platform}
            hint="Optional. Shown as a badge on the card."
          >
            <TextInput
              id="project-platform"
              value={form.platform}
              onChange={(event) => setField('platform')(event.target.value)}
              placeholder="Vercel, Netlify, Render…"
              list={platformListId}
              maxLength={60}
              invalid={Boolean(errors.platform)}
            />
            <datalist id={platformListId}>
              {PLATFORM_SUGGESTIONS.map((platform) => (
                <option key={platform} value={platform} />
              ))}
            </datalist>
          </Field>
        </div>

        {submitError ? (
          <div
            role="alert"
            className="mt-5 flex items-start gap-2.5 rounded-lg border border-danger/30 bg-danger/10 px-3.5 py-3 text-[13px] text-danger"
          >
            <IconAlert size={16} className="mt-0.5 shrink-0" />
            <span>{submitError}</span>
          </div>
        ) : null}

        <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-border pt-5">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            loading={submitting}
            loadingLabel={isEdit ? 'Saving…' : 'Adding…'}
          >
            {isEdit ? 'Save changes' : 'Add project'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
