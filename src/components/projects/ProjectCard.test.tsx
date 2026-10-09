import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { ProjectCard } from './ProjectCard'
import { ProjectCardMenu } from './ProjectCardMenu'
import type { Project } from '../../lib/database.types'

const project: Project = {
  id: 'p1',
  user_id: 'user-1',
  name: 'Storefy',
  url: 'https://storefy.vercel.app',
  image_path: 'user-1/old-image.png',
  description: 'A store dashboard',
  platform: 'Vercel',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

function renderCard(actions?: ReactNode) {
  render(
    <ProjectCard
      project={project}
      imageUrl="https://signed.example/old-image.png"
      index={0}
      actions={actions}
    />
  )
  // The card content area is the primary navigation link.
  return {
    mainLink: screen.getByRole('link', {
      name: 'Open Storefy in a new tab',
    }),
    openProjectLink: screen.getByRole('link', { name: 'Open project' }),
  }
}

describe('ProjectCard', () => {
  it('renders the thumbnail from the signed image URL', () => {
    renderCard()

    const image = screen.getByRole('img', {
      name: 'Storefy thumbnail',
    })
    expect(image).toHaveAttribute(
      'src',
      'https://signed.example/old-image.png'
    )
  })

  it('renders a navigation link with safe external attributes', () => {
    const { mainLink, openProjectLink } = renderCard()

    for (const link of [mainLink, openProjectLink]) {
      expect(link).toHaveAttribute(
        'href',
        'https://storefy.vercel.app'
      )
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    }
  })

  it('navigates when the card content area is clicked', () => {
    const { mainLink } = renderCard()

    // fireEvent reports whether the default action was
    // prevented, so true means the link would navigate.
    expect(fireEvent.click(mainLink)).toBe(true)
  })

  it('navigates when the Open project link is clicked', () => {
    const { openProjectLink } = renderCard()

    expect(fireEvent.click(openProjectLink)).toBe(true)
  })

  it('keeps card actions outside any navigation link', () => {
    renderCard(<button type="button">Actions</button>)
    const actionButton = screen.getByRole('button', {
      name: 'Actions',
    })

    // Regression: actions must not be nested inside the
    // card anchor, where clicks and keydowns leak to the
    // navigation link.
    expect(actionButton.closest('a')).toBeNull()
  })

  it('does not prevent card action clicks or keyboard activation', () => {
    renderCard(<button type="button">Actions</button>)
    const actionButton = screen.getByRole('button', {
      name: 'Actions',
    })

    // Regression: the old wrapper called preventDefault on
    // click, Enter and Space, which cancelled keyboard
    // activation of the controls.
    expect(fireEvent.click(actionButton)).toBe(true)
    expect(
      fireEvent.keyDown(actionButton, { key: 'Enter' })
    ).toBe(true)
    expect(
      fireEvent.keyDown(actionButton, { key: ' ' })
    ).toBe(true)
  })

  it('does not navigate when a contextual menu action runs', () => {
    const onEdit = vi.fn()
    const onDelete = vi.fn()
    renderCard(
      <ProjectCardMenu
        projectName={project.name}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    )

    const trigger = screen.getByRole('button', {
      name: 'Actions for Storefy',
    })
    expect(trigger.closest('a')).toBeNull()

    expect(fireEvent.click(trigger)).toBe(true)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')

    const deleteItem = screen.getByRole('menuitem', {
      name: 'Delete project',
    })
    expect(deleteItem.closest('a')).toBeNull()
    expect(fireEvent.click(deleteItem)).toBe(true)

    expect(onDelete).toHaveBeenCalledTimes(1)
    expect(onEdit).not.toHaveBeenCalled()
  })

  it('runs the edit action from the contextual menu', () => {
    const onEdit = vi.fn()
    const onDelete = vi.fn()
    renderCard(
      <ProjectCardMenu
        projectName={project.name}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Actions for Storefy',
      })
    )
    fireEvent.click(
      screen.getByRole('menuitem', { name: 'Edit project' })
    )

    expect(onEdit).toHaveBeenCalledTimes(1)
    expect(onDelete).not.toHaveBeenCalled()
    expect(
      screen.getByRole('button', { name: 'Actions for Storefy' })
    ).toHaveAttribute('aria-expanded', 'false')
  })

  it('shows the platform badge and description', () => {
    renderCard()

    expect(screen.getByText('Vercel')).toBeInTheDocument()
    expect(screen.getByText('A store dashboard')).toBeInTheDocument()
    expect(screen.getByText('Storefy')).toBeInTheDocument()
  })

  it('hides the image when the signed URL fails to load', () => {
    renderCard()

    const image = screen.getByRole('img', {
      name: 'Storefy thumbnail',
    })
    fireEvent.error(image)

    // The failed image is replaced by the placeholder icon.
    expect(screen.queryAllByRole('img')).toHaveLength(0)
  })
})
