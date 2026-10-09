import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  PROJECT_IMAGES_BUCKET,
  deleteProject,
  getProjectImageUrls,
  updateProject,
  validateProjectImage,
} from './projects'
import type { Project, UpdateProjectInput } from './database.types'

// These tests mock the Supabase client. They verify the data
// layer's own ordering, rollback, and error-reporting logic.
// They do not run against a real Supabase project and do not
// prove RLS or Storage policy enforcement.
const mocks = vi.hoisted(() => ({
  supabase: {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
    storage: { from: vi.fn() },
  },
}))

vi.mock('./supabase/client', () => ({
  getSupabase: () => mocks.supabase,
}))

interface MockResult {
  data: unknown
  error: { message: string; code?: string } | null
}

// The real Postgrest builder is thenable and every chaining
// method returns the builder, so a single thenable object with
// pass-through methods models the shapes used by the data layer.
function makeQuery(result: MockResult) {
  const query = {
    select: vi.fn(() => query),
    order: vi.fn(() => query),
    eq: vi.fn(() => query),
    insert: vi.fn(() => query),
    update: vi.fn(() => query),
    delete: vi.fn(() => query),
    maybeSingle: vi.fn(() => query),
    single: vi.fn(() => query),
  }
  return Object.assign(query, {
    then: (
      onFulfilled: (value: MockResult) => unknown,
      onRejected: (reason: unknown) => unknown
    ) => Promise.resolve(result).then(onFulfilled, onRejected),
  })
}

const bucket = {
  upload: vi.fn(),
  remove: vi.fn(),
  createSignedUrls: vi.fn(),
}

const USER_ID = 'user-1'

const currentProject: Project = {
  id: 'p1',
  user_id: USER_ID,
  name: 'Storefy',
  url: 'https://storefy.vercel.app',
  image_path: `${USER_ID}/old-image.png`,
  description: 'A store dashboard',
  platform: 'Vercel',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

function makeImage(): File {
  return new File(['png-bytes'], 'thumbnail.png', { type: 'image/png' })
}

function textInput(
  overrides: Partial<UpdateProjectInput> = {}
): UpdateProjectInput {
  return {
    name: 'Storefy 2.0',
    url: 'https://storefy-v2.vercel.app',
    description: 'Updated description',
    platform: 'Netlify',
    image: null,
    ...overrides,
  }
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.supabase.auth.getUser.mockResolvedValue({
    data: { user: { id: USER_ID } },
    error: null,
  })
  mocks.supabase.storage.from.mockReturnValue(bucket)
})

describe('validateProjectImage', () => {
  it('accepts supported image types within the size limit', () => {
    expect(validateProjectImage(makeImage())).toBeNull()
  })

  it('rejects unsupported formats', () => {
    const file = new File(['bytes'], 'document.pdf', {
      type: 'application/pdf',
    })
    expect(validateProjectImage(file)).toMatch(/Unsupported image format/)
  })

  it('rejects images larger than 5 MB', () => {
    const file = new File(['x'], 'big.png', { type: 'image/png' })
    Object.defineProperty(file, 'size', { value: 6 * 1024 * 1024 })
    expect(validateProjectImage(file)).toMatch(/too large/)
  })
})

describe('getProjectImageUrls', () => {
  // Reproduces the real storage-js createSignedUrls()
  // response shape: each entry carries both `signedURL`
  // (a relative storage path) and `signedUrl` (the
  // complete absolute URL), plus a per-object error.
  function signedUrlEntry(
    path: string,
    token: string
  ): {
    error: string | null
    path: string | null
    signedURL: string | null
    signedUrl: string | null
  } {
    return {
      error: null,
      path,
      signedURL: `/object/sign/project-images/${path}?token=${token}`,
      signedUrl: `https://your-ref.supabase.co/storage/v1/object/sign/project-images/${path}?token=${token}`,
    }
  }

  it('returns an empty map without calling storage when no paths are given', async () => {
    const urls = await getProjectImageUrls([])
    expect(urls).toEqual({})
    expect(mocks.supabase.storage.from).not.toHaveBeenCalled()
  })

  it('maps each path to the complete signedUrl, not the relative signedURL', async () => {
    bucket.createSignedUrls.mockResolvedValue({
      data: [signedUrlEntry('user-1/a.png', 'token-a')],
      error: null,
    })

    const urls = await getProjectImageUrls(['user-1/a.png'])

    expect(urls).toEqual({
      'user-1/a.png':
        'https://your-ref.supabase.co/storage/v1/object/sign/project-images/user-1/a.png?token=token-a',
    })
    expect(urls['user-1/a.png']).toMatch(/^https:\/\//)
    expect(urls['user-1/a.png']).not.toMatch(/^\/object\//)
  })

  it('deduplicates paths and maps each one to its signed URL', async () => {
    bucket.createSignedUrls.mockResolvedValue({
      data: [
        signedUrlEntry('user-1/a.png', 'token-a'),
        signedUrlEntry('user-1/b.png', 'token-b'),
      ],
      error: null,
    })

    const urls = await getProjectImageUrls([
      'user-1/a.png',
      'user-1/b.png',
      'user-1/a.png',
    ])

    expect(urls).toEqual({
      'user-1/a.png':
        'https://your-ref.supabase.co/storage/v1/object/sign/project-images/user-1/a.png?token=token-a',
      'user-1/b.png':
        'https://your-ref.supabase.co/storage/v1/object/sign/project-images/user-1/b.png?token=token-b',
    })
    expect(mocks.supabase.storage.from).toHaveBeenCalledWith(
      PROJECT_IMAGES_BUCKET
    )
    expect(bucket.createSignedUrls).toHaveBeenCalledWith(
      ['user-1/a.png', 'user-1/b.png'],
      3600
    )
  })

  it('throws when a per-object storage error is reported', async () => {
    bucket.createSignedUrls.mockResolvedValue({
      data: [
        {
          error: 'Object not found',
          path: 'user-1/missing.png',
          signedURL: null,
          signedUrl: null,
        },
      ],
      error: null,
    })

    await expect(
      getProjectImageUrls(['user-1/missing.png'])
    ).rejects.toThrow('Object not found')
  })

  it('throws when a response entry has no signed URL', async () => {
    bucket.createSignedUrls.mockResolvedValue({
      data: [{ error: null, path: 'user-1/a.png', signedURL: null, signedUrl: null }],
      error: null,
    })

    await expect(getProjectImageUrls(['user-1/a.png'])).rejects.toThrow(
      'Could not retrieve a signed URL for a project image.'
    )
  })

  it('throws when signing fails', async () => {
    bucket.createSignedUrls.mockResolvedValue({
      data: null,
      error: { message: 'Signing failed' },
    })
    await expect(getProjectImageUrls(['user-1/a.png'])).rejects.toThrow(
      'Signing failed'
    )
  })
})

describe('updateProject', () => {
  function setupQueries(fetchResult: MockResult, updateResult: MockResult) {
    const fetchQuery = makeQuery(fetchResult)
    const updateQuery = makeQuery(updateResult)
    mocks.supabase.from
      .mockReturnValueOnce(fetchQuery)
      .mockReturnValueOnce(updateQuery)
    return { fetchQuery, updateQuery }
  }

  it('uploads to a unique user-namespaced path and removes the old image only after the update succeeds', async () => {
    const updated: Project = {
      ...currentProject,
      name: 'Storefy 2.0',
      url: 'https://storefy-v2.vercel.app',
      image_path: 'user-1/new-image.png',
    }
    const { updateQuery } = setupQueries(
      { data: currentProject, error: null },
      { data: updated, error: null }
    )
    bucket.upload.mockResolvedValue({ data: null, error: null })
    bucket.remove.mockResolvedValue({ data: null, error: null })

    const result = await updateProject('p1', textInput({ image: makeImage() }))

    expect(result.project).toEqual(updated)
    expect(result.cleanupWarning).toBeNull()
    expect(bucket.upload).toHaveBeenCalledTimes(1)
    const uploadPath = bucket.upload.mock.calls[0][0] as string
    expect(uploadPath).toMatch(/^user-1\/[0-9a-f-]+-thumbnail\.png\.png$/)
    expect(updateQuery.update).toHaveBeenCalledWith(
      {
        name: 'Storefy 2.0',
        url: 'https://storefy-v2.vercel.app',
        description: 'Updated description',
        platform: 'Netlify',
        image_path: uploadPath,
      }
    )
    expect(updateQuery.eq).toHaveBeenCalledWith('id', 'p1')
    expect(bucket.remove).toHaveBeenCalledWith([`${USER_ID}/old-image.png`])
    expect(bucket.upload.mock.invocationCallOrder[0]).toBeLessThan(
      updateQuery.update.mock.invocationCallOrder[0]
    )
    expect(updateQuery.update.mock.invocationCallOrder[0]).toBeLessThan(
      bucket.remove.mock.invocationCallOrder[0]
    )
  })

  it('preserves the existing project when the new image upload fails', async () => {
    const { updateQuery } = setupQueries(
      { data: currentProject, error: null },
      { data: null, error: null }
    )
    bucket.upload.mockResolvedValue({
      data: null,
      error: { message: 'Upload failed' },
    })

    await expect(
      updateProject('p1', textInput({ image: makeImage() }))
    ).rejects.toThrow('Upload failed')

    expect(updateQuery.update).not.toHaveBeenCalled()
    expect(bucket.remove).not.toHaveBeenCalled()
  })

  it('removes the newly uploaded image and keeps the old record when the database update fails', async () => {
    setupQueries(
      { data: currentProject, error: null },
      { data: null, error: { message: 'Database update failed' } }
    )
    bucket.upload.mockResolvedValue({ data: null, error: null })
    bucket.remove.mockResolvedValue({ data: null, error: null })

    await expect(
      updateProject('p1', textInput({ image: makeImage() }))
    ).rejects.toThrow('Database update failed')

    expect(bucket.remove).toHaveBeenCalledTimes(1)
    const removedPath = bucket.remove.mock.calls[0][0] as string[]
    expect(removedPath).toHaveLength(1)
    expect(removedPath[0]).toMatch(/^user-1\//)
    expect(removedPath[0]).not.toBe(`${USER_ID}/old-image.png`)
  })

  it('keeps the successful update and reports a warning when old-image cleanup fails', async () => {
    const updated: Project = {
      ...currentProject,
      name: 'Storefy 2.0',
      url: 'https://storefy-v2.vercel.app',
    }
    setupQueries(
      { data: currentProject, error: null },
      { data: updated, error: null }
    )
    bucket.upload.mockResolvedValue({ data: null, error: null })
    bucket.remove.mockResolvedValue({
      data: null,
      error: { message: 'Storage unavailable' },
    })

    const result = await updateProject('p1', textInput({ image: makeImage() }))

    expect(result.project).toEqual(updated)
    expect(result.cleanupWarning).toMatch(
      /previous thumbnail could not be removed/
    )
    expect(result.cleanupWarning).toMatch(/Storage unavailable/)
  })

  it('updates text fields without touching storage when no image is supplied', async () => {
    const updated: Project = {
      ...currentProject,
      name: 'Storefy 2.0',
      url: 'https://storefy-v2.vercel.app',
      description: 'Updated description',
      platform: 'Netlify',
    }
    const { updateQuery } = setupQueries(
      { data: currentProject, error: null },
      { data: updated, error: null }
    )

    const result = await updateProject('p1', textInput())

    expect(result.project).toEqual(updated)
    expect(result.cleanupWarning).toBeNull()
    expect(bucket.upload).not.toHaveBeenCalled()
    expect(bucket.remove).not.toHaveBeenCalled()
    expect(updateQuery.update).toHaveBeenCalledWith(
      {
        name: 'Storefy 2.0',
        url: 'https://storefy-v2.vercel.app',
        description: 'Updated description',
        platform: 'Netlify',
      }
    )
    expect(updateQuery.eq).toHaveBeenCalledWith('id', 'p1')
  })

  it('fails when the project does not exist', async () => {
    setupQueries({ data: null, error: null }, { data: null, error: null })
    await expect(updateProject('missing', textInput())).rejects.toThrow(
      'Project not found'
    )
  })

  it('requires an authenticated user', async () => {
    mocks.supabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    })
    await expect(updateProject('p1', textInput())).rejects.toThrow(
      'You must be signed in'
    )
  })
})

describe('deleteProject', () => {
  function setupQueries(fetchResult: MockResult, deleteResult: MockResult) {
    const fetchQuery = makeQuery(fetchResult)
    const deleteQuery = makeQuery(deleteResult)
    mocks.supabase.from
      .mockReturnValueOnce(fetchQuery)
      .mockReturnValueOnce(deleteQuery)
    return { fetchQuery, deleteQuery }
  }

  it('deletes the record through the data layer and removes its thumbnail', async () => {
    const { deleteQuery } = setupQueries(
      { data: { image_path: `${USER_ID}/old-image.png` }, error: null },
      { data: [{ id: 'p1' }], error: null }
    )
    bucket.remove.mockResolvedValue({ data: null, error: null })

    const result = await deleteProject('p1')

    expect(result.cleanupWarning).toBeNull()
    expect(deleteQuery.delete).toHaveBeenCalled()
    expect(deleteQuery.eq).toHaveBeenCalledWith('id', 'p1')
    expect(bucket.remove).toHaveBeenCalledWith([`${USER_ID}/old-image.png`])
  })

  it('skips storage cleanup when the project has no thumbnail', async () => {
    setupQueries(
      { data: { image_path: '' }, error: null },
      { data: [{ id: 'p1' }], error: null }
    )

    const result = await deleteProject('p1')

    expect(result.cleanupWarning).toBeNull()
    expect(bucket.remove).not.toHaveBeenCalled()
  })

  it('reports the project as deleted but warns honestly when thumbnail cleanup fails', async () => {
    setupQueries(
      { data: { image_path: `${USER_ID}/old-image.png` }, error: null },
      { data: [{ id: 'p1' }], error: null }
    )
    bucket.remove.mockResolvedValue({
      data: null,
      error: { message: 'Storage unavailable' },
    })

    const result = await deleteProject('p1')

    expect(result.cleanupWarning).toMatch(/thumbnail could not be removed/)
    expect(result.cleanupWarning).toMatch(/Storage unavailable/)
  })

  it('fails without touching storage when the record is already gone', async () => {
    const { deleteQuery } = setupQueries(
      { data: null, error: null },
      { data: null, error: null }
    )

    await expect(deleteProject('missing')).rejects.toThrow(
      'Project not found. It may have already been deleted.'
    )

    expect(deleteQuery.delete).not.toHaveBeenCalled()
    expect(bucket.remove).not.toHaveBeenCalled()
  })

  it('fails when the returned rows are empty', async () => {
    setupQueries(
      { data: { image_path: `${USER_ID}/old-image.png` }, error: null },
      { data: [], error: null }
    )
    await expect(deleteProject('p1')).rejects.toThrow(
      'Project not found. It may have already been deleted.'
    )
  })

  it('fails and keeps the thumbnail when the delete query errors', async () => {
    setupQueries(
      { data: { image_path: `${USER_ID}/old-image.png` }, error: null },
      { data: null, error: { message: 'Delete rejected' } }
    )

    await expect(deleteProject('p1')).rejects.toThrow('Delete rejected')

    expect(bucket.remove).not.toHaveBeenCalled()
  })

  it('requires an authenticated user', async () => {
    mocks.supabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    })
    await expect(deleteProject('p1')).rejects.toThrow(
      'You must be signed in'
    )
  })
})
