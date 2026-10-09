import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DashboardPage } from './DashboardPage'
import type { Project } from '../lib/database.types'

// The dashboard integration test mocks the data hook and
// the auth/theme contexts so the real Edit and Delete
// wiring can be verified without a Supabase project.
const mocks = vi.hoisted(() => ({
  projects: [] as Project[],
  imageUrls: {} as Record<string, string>,
  editProject: vi.fn(),
  removeProject: vi.fn(),
  addProject: vi.fn(),
  refresh: vi.fn(),
}))

vi.mock('../hooks/useProjects', () => ({
  useProjects: () => ({
    status: 'ready',
    projects: mocks.projects,
    imageUrls: mocks.imageUrls,
    error: null,
    refresh: mocks.refresh,
    addProject: mocks.addProject,
    editProject: mocks.editProject,
    removeProject: mocks.removeProject,
  }),
}))

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    session: { user: { id: 'user-1' } },
    user: { id: 'user-1', email: 'owner@example.com' },
    loading: false,
    configError: null,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    sendPasswordReset: vi.fn(),
    updatePassword: vi.fn(),
  }),
}))

vi.mock('../context/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark', toggleTheme: vi.fn() }),
}))

const firstProject: Project = {
  id: 'p1',
  user_id: 'user-1',
  name: 'Storefy',
  url: 'https://storefy.vercel.app',
  image_path: 'user-1/storefy.png',
  description: 'A store dashboard',
  platform: 'Vercel',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

const secondProject: Project = {
  id: 'p2',
  user_id: 'user-1',
  name: 'Portfolio',
  url: 'https://portfolio.example.com',
  image_path: 'user-1/portfolio.png',
  description: 'Personal portfolio site',
  platform: 'Netlify',
  created_at: '2026-01-02T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
}

function renderDashboard() {
  return render(<DashboardPage />)
}

function openMenuFor(projectName: string) {
  fireEvent.click(
    screen.getByRole('button', {
      name: `Actions for ${projectName}`,
    })
  )
}

describe('DashboardPage edit and delete flows', () => {
  it('opens the edit modal for the selected project and saves through editProject', async () => {
    mocks.projects = [firstProject, secondProject]
    mocks.editProject.mockResolvedValue({
      cleanupWarning: null,
    })
    renderDashboard()

    openMenuFor('Portfolio')
    fireEvent.click(
      screen.getByRole('menuitem', { name: 'Edit project' })
    )

    // The edit modal opens pre-filled with the
    // selected project's own values.
    const dialog = await screen.findByRole('dialog', {
      name: 'Edit project',
    })
    expect(dialog).toBeInTheDocument()
    expect(
      screen.getByLabelText('Project name')
    ).toHaveValue('Portfolio')
    expect(
      screen.getByLabelText('Destination URL')
    ).toHaveValue('https://portfolio.example.com')
    expect(
      screen.getByLabelText('Description')
    ).toHaveValue('Personal portfolio site')
    expect(
      screen.getByLabelText('Hosting platform')
    ).toHaveValue('Netlify')

    // The other project's modal must not be open.
    expect(
      screen.getByLabelText('Project name')
    ).not.toHaveValue('Storefy')

    fireEvent.change(screen.getByLabelText('Project name'), {
      target: { value: 'Portfolio 2.0' },
    })
    fireEvent.click(
      screen.getByRole('button', { name: 'Save changes' })
    )

    await waitFor(() =>
      expect(mocks.editProject).toHaveBeenCalledWith(
        'p2',
        {
          name: 'Portfolio 2.0',
          url: 'https://portfolio.example.com',
          description: 'Personal portfolio site',
          platform: 'Netlify',
          image: null,
        }
      )
    )

    // The modal closes after a successful save.
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Edit project' })
      ).not.toBeInTheDocument()
    )
  })

  it('cancelling an edit does not call editProject', () => {
    mocks.projects = [firstProject, secondProject]
    renderDashboard()

    openMenuFor('Portfolio')
    fireEvent.click(
      screen.getByRole('menuitem', { name: 'Edit project' })
    )

    screen.getByRole('dialog', { name: 'Edit project' })
    fireEvent.change(screen.getByLabelText('Project name'), {
      target: { value: 'Changed' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(mocks.editProject).not.toHaveBeenCalled()
  })

  it('opens the delete confirmation for the selected project and deletes through removeProject', async () => {
    mocks.projects = [firstProject, secondProject]
    mocks.removeProject.mockResolvedValue({
      cleanupWarning: null,
    })
    renderDashboard()

    openMenuFor('Portfolio')
    fireEvent.click(
      screen.getByRole('menuitem', { name: 'Delete project' })
    )

    // The confirmation dialog names the selected project.
    const dialog = await screen.findByRole('dialog', {
      name: 'Delete project',
    })
    expect(dialog).toBeInTheDocument()
    expect(
      screen.getByText(/Delete “Portfolio”\?/)
    ).toBeInTheDocument()
    expect(
      screen.getByText('https://portfolio.example.com')
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', { name: 'Delete project' })
    )

    await waitFor(() =>
      expect(mocks.removeProject).toHaveBeenCalledWith('p2')
    )
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Delete project' })
      ).not.toBeInTheDocument()
    )
  })

  it('keeps the delete dialog open when deletion fails', async () => {
    mocks.projects = [firstProject, secondProject]
    mocks.removeProject.mockRejectedValue(
      new Error('Delete failed')
    )
    renderDashboard()

    openMenuFor('Portfolio')
    fireEvent.click(
      screen.getByRole('menuitem', { name: 'Delete project' })
    )

    await screen.findByRole('dialog', {
      name: 'Delete project',
    })
    fireEvent.click(
      screen.getByRole('button', { name: 'Delete project' })
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Delete failed'
    )
    expect(
      screen.getByText(/Delete “Portfolio”\?/)
    ).toBeInTheDocument()
    expect(mocks.removeProject).toHaveBeenCalledTimes(1)
  })

  it('restores the empty state when the last project is removed', () => {
    mocks.projects = [firstProject]
    const { rerender } = renderDashboard()

    expect(
      screen.getByRole('link', {
        name: 'Open Storefy in a new tab',
      })
    ).toBeInTheDocument()

    // The hook removes the project from state after a
    // successful delete; simulate that state update.
    mocks.projects = []
    rerender(<DashboardPage />)

    expect(
      screen.getByRole('button', {
        name: 'Add your first project',
      })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('link', {
        name: 'Open Storefy in a new tab',
      })
    ).not.toBeInTheDocument()
  })
})
