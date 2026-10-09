import { useCallback, useEffect, useRef, useState } from 'react'
import {
  createProject,
  deleteProject,
  getProjectImageUrls,
  listProjects,
  updateProject,
} from '../lib/projects'
import type {
  MutationResult,
  NewProjectInput,
  Project,
  UpdateProjectInput,
} from '../lib/database.types'

export type ProjectsStatus = 'loading' | 'error' | 'ready'

interface UseProjectsResult {
  status: ProjectsStatus
  projects: Project[]
  imageUrls: Record<string, string>
  error: Error | null
  refresh: () => Promise<void>
  addProject: (input: NewProjectInput) => Promise<void>
  editProject: (
    id: string,
    input: UpdateProjectInput
  ) => Promise<MutationResult>
  removeProject: (id: string) => Promise<MutationResult>
}

export function useProjects(): UseProjectsResult {
  const [status, setStatus] = useState<ProjectsStatus>('loading')
  const [projects, setProjects] = useState<Project[]>([])
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({})
  const [error, setError] = useState<Error | null>(null)
  const mountedRef = useRef(true)

  const load = useCallback(async () => {
    setStatus('loading')
    setError(null)
    try {
      const rows = await listProjects()
      const urls = await getProjectImageUrls(
        rows.map((row) => row.image_path)
      )
      if (!mountedRef.current) {
        return
      }
      setProjects(rows)
      setImageUrls(urls)
      setStatus('ready')
    } catch (loadError) {
      if (!mountedRef.current) {
        return
      }
      setError(
        loadError instanceof Error
          ? loadError
          : new Error('Failed to load projects.')
      )
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    void load()
    return () => {
      mountedRef.current = false
    }
  }, [load])

  const addProject = useCallback(
    async (input: NewProjectInput) => {
      await createProject(input)
      await load()
    },
    [load]
  )

  // Reliable update-and-refetch strategy: the mutation runs
  // first, then only the affected project's record and signed
  // image URL are refreshed — no optimistic state to roll back.
  const editProject = useCallback(
    async (id: string, input: UpdateProjectInput): Promise<MutationResult> => {
      const { project, cleanupWarning } = await updateProject(id, input)
      setProjects((current) =>
        current.map((item) => (item.id === id ? project : item))
      )
      const urls = await getProjectImageUrls([project.image_path])
      setImageUrls((current) => ({ ...current, ...urls }))
      return { cleanupWarning }
    },
    []
  )

  const removeProject = useCallback(
    async (id: string): Promise<MutationResult> => {
      const { cleanupWarning } = await deleteProject(id)
      setProjects((current) => current.filter((item) => item.id !== id))
      return { cleanupWarning }
    },
    []
  )

  return {
    status,
    projects,
    imageUrls,
    error,
    refresh: load,
    addProject,
    editProject,
    removeProject,
  }
}
