import { useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Navbar } from '../components/layout/Navbar'
import { AddProjectModal } from '../components/projects/AddProjectModal'
import { DeleteProjectDialog } from '../components/projects/DeleteProjectDialog'
import { ProjectCardMenu } from '../components/projects/ProjectCardMenu'
import { ProjectGrid } from '../components/projects/ProjectGrid'
import { IconAlert, IconX } from '../components/ui/Icons'
import { useProjects } from '../hooks/useProjects'
import type { Project, UpdateProjectInput } from '../lib/database.types'

export function DashboardPage() {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [deletingProject, setDeletingProject] = useState<Project | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const {
    status,
    projects,
    imageUrls,
    error,
    refresh,
    addProject,
    editProject,
    removeProject,
  } = useProjects()

  const filteredProjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) {
      return projects
    }
    return projects.filter((project) =>
      [project.name, project.description, project.platform]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(query))
    )
  }, [projects, searchQuery])

  const handleUpdateProject = async (
    id: string,
    input: UpdateProjectInput
  ) => {
    const { cleanupWarning } = await editProject(id, input)
    if (cleanupWarning) {
      setNotice(cleanupWarning)
    }
  }

  const handleDeleteProject = async (id: string) => {
    const { cleanupWarning } = await removeProject(id)
    if (cleanupWarning) {
      setNotice(cleanupWarning)
    }
  }

  const cardActions = (project: Project) => (
    <ProjectCardMenu
      projectName={project.name}
      onEdit={() => setEditingProject(project)}
      onDelete={() => setDeletingProject(project)}
    />
  )

  return (
    <div className="min-h-screen bg-canvas">
      <Navbar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        onAddProject={() => setAddOpen(true)}
      />

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              My Projects
            </h1>
            <p className="mt-1.5 text-[15px] text-ink-2">
              Everything you&apos;ve built, one click away.
            </p>
          </div>
          <span className="inline-flex items-center rounded-full border border-border bg-surface px-3 py-1 text-[13px] font-medium text-ink-2">
            {projects.length} {projects.length === 1 ? 'project' : 'projects'}
          </span>
        </div>

        {notice ? (
          <div
            role="status"
            className="animate-fade-in mt-6 flex items-start gap-2.5 rounded-xl border border-accent/30 bg-accent-soft px-4 py-3 text-[13px] text-ink"
          >
            <IconAlert size={16} className="mt-0.5 shrink-0 text-accent" />
            <span className="min-w-0 flex-1">{notice}</span>
            <button
              type="button"
              onClick={() => setNotice(null)}
              aria-label="Dismiss notification"
              className="rounded-md p-1 text-ink-3 transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              <IconX size={14} />
            </button>
          </div>
        ) : null}

        <div className="mt-8">
          <ProjectGrid
            status={status}
            projects={filteredProjects}
            imageUrls={imageUrls}
            searchQuery={searchQuery}
            error={error}
            onRetry={() => void refresh()}
            onClearSearch={() => setSearchQuery('')}
            onAddProject={() => setAddOpen(true)}
            actions={cardActions}
          />
        </div>
      </main>

      <footer className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
        <div className="mt-6 border-t border-border pt-6 text-center text-[13px] text-ink-3">
          Signed in as{' '}
          <span className="font-medium text-ink-2">
            {user?.email ?? 'unknown user'}
          </span>
          {' · '}Launchpad self-hosted instance
        </div>
      </footer>

      <AddProjectModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={addProject}
      />

      <AddProjectModal
        open={editingProject !== null}
        onClose={() => setEditingProject(null)}
        onSubmit={addProject}
        onUpdate={handleUpdateProject}
        project={editingProject}
        imageUrl={
          editingProject
            ? imageUrls[editingProject.image_path] ?? null
            : null
        }
      />

      <DeleteProjectDialog
        open={deletingProject !== null}
        project={deletingProject}
        onClose={() => setDeletingProject(null)}
        onConfirm={handleDeleteProject}
      />
    </div>
  )
}
