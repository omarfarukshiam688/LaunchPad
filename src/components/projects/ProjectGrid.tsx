import { type ReactNode } from 'react'
import type { Project } from '../../lib/database.types'
import {
  IconAlert,
  IconPlus,
  IconRefresh,
  IconRocket,
  IconSearch,
} from '../ui/Icons'
import { ProjectCard } from './ProjectCard'

interface ProjectGridProps {
  status: 'loading' | 'error' | 'ready'
  projects: Project[]
  imageUrls: Record<string, string>
  searchQuery: string
  error: Error | null
  onRetry: () => void
  onClearSearch: () => void
  onAddProject: () => void
  actions?: (project: Project) => ReactNode
}

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="aspect-[16/10] animate-pulse bg-surface-2" />
      <div className="space-y-2.5 p-4">
        <div className="h-4 w-2/3 animate-pulse rounded bg-surface-2" />
        <div className="h-3 w-full animate-pulse rounded bg-surface-2" />
        <div className="h-3 w-4/5 animate-pulse rounded bg-surface-2" />
      </div>
    </div>
  )
}

export function ProjectGrid({
  status,
  projects,
  imageUrls,
  searchQuery,
  error,
  onRetry,
  onClearSearch,
  onAddProject,
  actions,
}: ProjectGridProps) {
  if (status === 'loading') {
    return (
      <div
        className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        aria-label="Loading projects"
        aria-busy="true"
      >
        {Array.from({ length: 8 }).map((_, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-border bg-surface px-6 py-16 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-danger">
          <IconAlert size={22} />
        </span>
        <h3 className="mt-4 text-base font-semibold text-ink">
          Couldn&apos;t load projects
        </h3>
        <p className="mt-1.5 max-w-sm text-sm text-ink-2">
          {error?.message ?? 'An unexpected error occurred while loading your projects.'}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-medium text-ink transition-colors hover:border-border-strong hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <IconRefresh size={15} />
          Try again
        </button>
      </div>
    )
  }

  if (projects.length === 0 && searchQuery.trim() !== '') {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-border bg-surface px-6 py-16 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-ink-3">
          <IconSearch size={20} />
        </span>
        <h3 className="mt-4 text-base font-semibold text-ink">
          No matching projects
        </h3>
        <p className="mt-1.5 max-w-sm text-sm text-ink-2">
          No projects match &ldquo;{searchQuery.trim()}&rdquo;. Try a
          different name, description, or platform.
        </p>
        <button
          type="button"
          onClick={onClearSearch}
          className="mt-5 inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-medium text-ink transition-colors hover:border-border-strong hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          Clear search
        </button>
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed border-border-strong bg-surface px-6 py-20 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <IconRocket size={26} />
        </span>
        <h3 className="mt-5 text-lg font-semibold tracking-tight text-ink">
          No projects yet
        </h3>
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-ink-2">
          Add your first deployed project to start opening everything
          from one place.
        </p>
        <button
          type="button"
          onClick={onAddProject}
          className="mt-6 inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-accent-ink shadow-sm transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <IconPlus size={15} />
          Add your first project
        </button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {projects.map((project, index) => (
        <ProjectCard
          key={project.id}
          project={project}
          imageUrl={imageUrls[project.image_path] ?? null}
          index={index}
          actions={actions ? actions(project) : undefined}
        />
      ))}
    </div>
  )
}
