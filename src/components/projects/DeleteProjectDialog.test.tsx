import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Mock } from 'vitest'
import { DeleteProjectDialog } from './DeleteProjectDialog'
import type { Project } from '../../lib/database.types'

type ConfirmHandler = (id: string) => Promise<void>

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

function renderDialog(options: { onConfirm?: ConfirmHandler } = {}) {
  const onClose = vi.fn()
  const onConfirm = (options.onConfirm ??
    vi.fn((_id: string) => Promise.resolve())) as Mock<ConfirmHandler>
  render(
    <DeleteProjectDialog
      open={true}
      project={project}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  )
  return { onClose, onConfirm }
}

function clickDelete() {
  fireEvent.click(
    screen.getByRole('button', { name: 'Delete project' })
  )
}

describe('DeleteProjectDialog', () => {
  it('identifies the selected project before deleting', () => {
    renderDialog()

    expect(
      screen.getByRole('dialog', { name: 'Delete project' })
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Delete “Storefy”\?/)
    ).toBeInTheDocument()
    expect(
      screen.getByText('https://storefy.vercel.app')
    ).toBeInTheDocument()
  })

  it('deletes the project on confirm', async () => {
    const { onClose, onConfirm } = renderDialog()

    clickDelete()

    await waitFor(() =>
      expect(onConfirm).toHaveBeenCalledWith('p1')
    )
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
  })

  it('keeps the project displayed when deletion fails', async () => {
    const { onConfirm, onClose } = renderDialog({
      onConfirm: vi.fn((_id: string) =>
        Promise.reject(new Error('Delete failed'))
      ),
    })

    clickDelete()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Delete failed'
    )
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1))
    expect(onClose).not.toHaveBeenCalled()
    expect(
      screen.getByText(/Delete “Storefy”\?/)
    ).toBeInTheDocument()
  })

  it('cancelling does not delete the project', () => {
    const { onClose, onConfirm } = renderDialog()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()
  })
})
