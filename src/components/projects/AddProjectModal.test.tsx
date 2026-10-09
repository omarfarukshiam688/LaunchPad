import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Mock } from 'vitest'
import { AddProjectModal } from './AddProjectModal'
import type {
  NewProjectInput,
  Project,
  UpdateProjectInput,
} from '../../lib/database.types'

type UpdateHandler = (
  id: string,
  input: UpdateProjectInput
) => Promise<void>
type SubmitHandler = (input: NewProjectInput) => Promise<void>

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

function renderModal(options: {
  onUpdate?: UpdateHandler
  onSubmit?: SubmitHandler
} = {}) {
  const onClose = vi.fn()
  const onSubmit = (options.onSubmit ??
    vi.fn((_input: NewProjectInput) =>
      Promise.resolve()
    )) as Mock<SubmitHandler>
  const onUpdate = (options.onUpdate ??
    vi.fn((_id: string, _input: UpdateProjectInput) =>
      Promise.resolve()
    )) as Mock<UpdateHandler>
  render(
    <AddProjectModal
      open={true}
      onClose={onClose}
      onSubmit={onSubmit}
      onUpdate={onUpdate}
      project={project}
      imageUrl="https://signed.example/old-image.png"
    />
  )
  return { onClose, onSubmit, onUpdate }
}

function setField(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), {
    target: { value },
  })
}

function clickSave() {
  fireEvent.click(
    screen.getByRole('button', { name: 'Save changes' })
  )
}

describe('AddProjectModal (edit mode)', () => {
  it('pre-fills the form with the project being edited', () => {
    renderModal()

    expect(
      screen.getByRole('dialog', { name: 'Edit project' })
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Project name')).toHaveValue(
      'Storefy'
    )
    expect(screen.getByLabelText('Destination URL')).toHaveValue(
      'https://storefy.vercel.app'
    )
    expect(screen.getByLabelText('Description')).toHaveValue(
      'A store dashboard'
    )
    expect(screen.getByLabelText('Hosting platform')).toHaveValue(
      'Vercel'
    )
  })

  it('saves trimmed and normalized values through onUpdate', async () => {
    const { onUpdate, onClose } = renderModal()

    setField('Project name', '  Storefy 2.0 ')
    setField('Destination URL', 'storefy-v2.vercel.app')
    setField('Description', '')
    setField('Hosting platform', '')
    clickSave()

    await waitFor(() => expect(onUpdate).toHaveBeenCalledTimes(1))
    expect(onUpdate).toHaveBeenCalledWith('p1', {
      name: 'Storefy 2.0',
      url: 'https://storefy-v2.vercel.app',
      description: null,
      platform: null,
      image: null,
    })
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
  })

  it('rejects URLs that do not use http or https', async () => {
    const { onUpdate } = renderModal()

    setField('Destination URL', 'ftp://example.com')
    clickSave()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'URL must start with http:// or https://'
    )
    expect(onUpdate).not.toHaveBeenCalled()
  })

  it('rejects malformed URLs', async () => {
    const { onUpdate } = renderModal()

    setField('Destination URL', 'not a url')
    clickSave()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Enter a valid URL'
    )
    expect(onUpdate).not.toHaveBeenCalled()
  })

  it('requires a URL', async () => {
    const { onUpdate } = renderModal()

    setField('Destination URL', '')
    clickSave()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Project URL is required.'
    )
    expect(onUpdate).not.toHaveBeenCalled()
  })

  it('cancelling an edit closes the dialog without saving', () => {
    const { onClose, onUpdate } = renderModal()

    setField('Project name', 'Renamed')
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onUpdate).not.toHaveBeenCalled()
  })

  it('keeps the edited values and shows the error when the update fails', async () => {
    const { onUpdate, onClose } = renderModal({
      onUpdate: vi.fn((_id: string, _input: UpdateProjectInput) =>
        Promise.reject(new Error('Update failed'))
      ),
    })

    setField('Project name', 'Renamed')
    clickSave()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Update failed'
    )
    expect(screen.getByLabelText('Project name')).toHaveValue(
      'Renamed'
    )
    expect(screen.getByLabelText('Destination URL')).toHaveValue(
      'https://storefy.vercel.app'
    )
    await waitFor(() => expect(onUpdate).toHaveBeenCalledTimes(1))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('reports image replacement failures without losing the form', async () => {
    const { onUpdate, onClose } = renderModal({
      onUpdate: vi.fn((_id: string, _input: UpdateProjectInput) =>
        Promise.reject(new Error('Image upload failed'))
      ),
    })

    const file = new File(['png'], 'new-thumbnail.png', {
      type: 'image/png',
    })
    const fileInput = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement
    fireEvent.change(fileInput, { target: { files: [file] } })
    setField('Project name', 'Renamed')
    clickSave()

    await waitFor(() => expect(onUpdate).toHaveBeenCalledTimes(1))
    expect(onUpdate.mock.calls[0][1]).toMatchObject({
      image: file,
    })
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Image upload failed'
    )
    expect(screen.getByLabelText('Project name')).toHaveValue(
      'Renamed'
    )
    expect(onClose).not.toHaveBeenCalled()
  })

  it('prevents duplicate submissions while saving', async () => {
    const onUpdate = vi.fn(
      (_id: string, _input: UpdateProjectInput) =>
        new Promise<void>(() => {})
    )
    renderModal({ onUpdate })

    setField('Project name', 'Renamed')
    clickSave()

    const savingButton = await screen.findByRole('button', {
      name: 'Saving…',
    })
    expect(savingButton).toBeDisabled()
    await waitFor(() => expect(onUpdate).toHaveBeenCalledTimes(1))
  })
})
