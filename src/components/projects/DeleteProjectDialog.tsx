import { useEffect, useState, type FormEvent } from 'react'
import type { Project } from '../../lib/database.types'
import { Button } from '../ui/Button'
import { IconAlert, IconTrash } from '../ui/Icons'
import { Modal } from '../ui/Modal'

interface DeleteProjectDialogProps {
  open: boolean
  project: Project | null
  onClose: () => void
  onConfirm: (id: string) => Promise<void>
}

export function DeleteProjectDialog({
  open,
  project,
  onClose,
  onConfirm,
}: DeleteProjectDialogProps) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setDeleting(false)
      setError(null)
    }
  }, [open, project])

  if (!project) {
    return null
  }

  const handleConfirm = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setDeleting(true)
    try {
      await onConfirm(project.id)
      onClose()
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'Could not delete the project. Please try again.'
      )
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Delete project"
      description="This action cannot be undone."
    >
      <form onSubmit={handleConfirm} noValidate>
        <div className="flex items-start gap-3 rounded-xl border border-border bg-surface-2/60 px-4 py-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-danger/10 text-danger">
            <IconTrash size={17} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink">
              Delete &ldquo;{project.name}&rdquo;?
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
              <span className="break-all text-ink-3">{project.url}</span> and
              its thumbnail will be permanently removed from your Launchpad
              workspace.
            </p>
          </div>
        </div>

        {error ? (
          <div
            role="alert"
            className="mt-5 flex items-start gap-2.5 rounded-lg border border-danger/30 bg-danger/10 px-3.5 py-3 text-[13px] text-danger"
          >
            <IconAlert size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-border pt-5">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="danger"
            loading={deleting}
            loadingLabel="Deleting…"
          >
            <IconTrash size={15} />
            Delete project
          </Button>
        </div>
      </form>
    </Modal>
  )
}
