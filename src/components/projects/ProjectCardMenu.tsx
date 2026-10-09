import { useEffect, useRef, useState } from 'react'
import { IconMore, IconPencil, IconTrash } from '../ui/Icons'

interface ProjectCardMenuProps {
  projectName: string
  onEdit: () => void
  onDelete: () => void
}

export function ProjectCardMenu({
  projectName,
  onEdit,
  onDelete,
}: ProjectCardMenuProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const editItemRef = useRef<HTMLButtonElement>(null)
  const deleteItemRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      } else if (event.key === 'ArrowDown') {
        event.preventDefault()
        deleteItemRef.current?.focus()
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        editItemRef.current?.focus()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const closeAndRun = (action: () => void) => {
    setOpen(false)
    triggerRef.current?.focus()
    action()
  }

  const menuClasses =
    'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus'

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Actions for ${projectName}`}
        title="Project actions"
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-ink-2 transition-colors hover:border-border-strong hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        <IconMore size={16} />
      </button>

      {open && (
        <div
          role="menu"
          aria-label={`Actions for ${projectName}`}
          className="animate-fade-in absolute right-0 top-full z-40 mt-2 w-44 overflow-hidden rounded-xl border border-border bg-surface p-1.5 shadow-xl shadow-black/25"
        >
          <button
            ref={editItemRef}
            type="button"
            role="menuitem"
            onClick={() => closeAndRun(onEdit)}
            className={`${menuClasses} text-ink hover:bg-surface-2`}
          >
            <IconPencil size={15} />
            Edit project
          </button>
          <button
            ref={deleteItemRef}
            type="button"
            role="menuitem"
            onClick={() => closeAndRun(onDelete)}
            className={`${menuClasses} text-danger/90 hover:bg-danger/10 hover:text-danger`}
          >
            <IconTrash size={15} />
            Delete project
          </button>
        </div>
      )}
    </div>
  )
}
