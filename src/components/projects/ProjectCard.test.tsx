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
  return { anchor: screen.getByRole('link') }
}

describe('ProjectCard', () => {
  it('renders a link that opens the project in a new tab', () => {
    const { anchor } = renderCard()

    expect(anchor).toHaveAttribute(
      'href',
      'https://storefy.vercel.app'
    )
    expect(anchor).toHaveAttribute('target', '_blank')
    expect(anchor).toHaveAttribute(
      'rel',
      'noopener noreferrer'
    )
    expect(anchor).toHaveAttribute(
      'aria-label',
      'Open Storefy in a new tab'
    )
  })

  it('navigates when the card itself is clicked', () => {
    const { anchor } = renderCard()

    // fireEvent reports whether the default action was
    // prevented, so true means the anchor would navigate.
    expect(fireEvent.click(anchor)).toBe(true)
  })

  it('does not navigate when card actions are clicked', () => {
    renderCard(<button type="button">Actions</button>)

    expect(
      fireEvent.click(
        screen.getByRole('button', { name: 'Actions' })
      )
    ).toBe(false)
  })

  it('does not navigate when card actions are activated by keyboard', () => {
    renderCard(<button type="button">Actions</button>)
    const actionButton = screen.getByRole('button', {
      name: 'Actions',
    })

    expect(
      fireEvent.keyDown(actionButton, { key: 'Enter' })
    ).toBe(false)
    expect(
      fireEvent.keyDown(actionButton, { key: ' ' })
    ).toBe(false)
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
    expect(fireEvent.click(trigger)).toBe(false)

    expect(
      fireEvent.click(
        screen.getByRole('menuitem', { name: 'Delete project' })
      )
    ).toBe(false)

    expect(onDelete).toHaveBeenCalledTimes(1)
    expect(onEdit).not.toHaveBeenCalled()
  })
})
