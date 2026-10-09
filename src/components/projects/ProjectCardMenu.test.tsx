import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ProjectCardMenu } from './ProjectCardMenu'

function renderMenu() {
  const onEdit = vi.fn()
  const onDelete = vi.fn()
  render(
    <ProjectCardMenu
      projectName="Storefy"
      onEdit={onEdit}
      onDelete={onDelete}
    />
  )
  return { onEdit, onDelete }
}

function getTrigger() {
  return screen.getByRole('button', {
    name: 'Actions for Storefy',
  })
}

describe('ProjectCardMenu', () => {
  it('opens the menu from the trigger', () => {
    renderMenu()
    const trigger = getTrigger()

    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(trigger)

    expect(
      screen.getByRole('menu', { name: 'Actions for Storefy' })
    ).toBeInTheDocument()
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
  })

  it('runs the edit action and returns focus to the trigger', () => {
    const { onEdit, onDelete } = renderMenu()

    fireEvent.click(getTrigger())
    fireEvent.click(
      screen.getByRole('menuitem', { name: 'Edit project' })
    )

    expect(onEdit).toHaveBeenCalledTimes(1)
    expect(onDelete).not.toHaveBeenCalled()
    const trigger = getTrigger()
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(document.activeElement).toBe(trigger)
  })

  it('runs the delete action and returns focus to the trigger', () => {
    const { onEdit, onDelete } = renderMenu()

    fireEvent.click(getTrigger())
    fireEvent.click(
      screen.getByRole('menuitem', { name: 'Delete project' })
    )

    expect(onDelete).toHaveBeenCalledTimes(1)
    expect(onEdit).not.toHaveBeenCalled()
    const trigger = getTrigger()
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(document.activeElement).toBe(trigger)
  })

  it('closes on Escape and returns focus to the trigger', () => {
    renderMenu()
    const trigger = getTrigger()

    fireEvent.click(trigger)
    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(document.activeElement).toBe(trigger)
  })
})
