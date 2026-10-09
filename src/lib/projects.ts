import { getSupabase } from './supabase/client'
import type {
  MutationResult,
  NewProjectInput,
  Project,
  UpdateProjectInput,
} from './database.types'

export const PROJECT_IMAGES_BUCKET = 'project-images'

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/avif',
])

const SIGNED_URL_LIFETIME_SECONDS = 3600

export function validateProjectImage(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return 'Unsupported image format. Use PNG, JPG, WebP, GIF, SVG or AVIF.'
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return 'Image is too large. The maximum file size is 5 MB.'
  }
  return null
}

export async function listProjects(): Promise<Project[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }
  return data ?? []
}

export async function getProjectImageUrls(
  paths: string[]
): Promise<Record<string, string>> {
  const uniquePaths = [...new Set(paths)]
  if (uniquePaths.length === 0) {
    return {}
  }

  const supabase = getSupabase()
  const { data, error } = await supabase.storage
    .from(PROJECT_IMAGES_BUCKET)
    .createSignedUrls(uniquePaths, SIGNED_URL_LIFETIME_SECONDS)

  if (error) {
    throw new Error(error.message)
  }

  const urls: Record<string, string> = {}
  if (data) {
    for (const result of data) {
      // The batch API reports failures per object, so each
      // entry is checked explicitly: a failed or missing
      // signed URL must surface as an error instead of a
      // silently broken thumbnail.
      if (result.error) {
        throw new Error(result.error)
      }
      if (!result.path || !result.signedUrl) {
        throw new Error(
          'Could not retrieve a signed URL for a project image.'
        )
      }
      // `signedUrl` is the complete absolute URL. The
      // uppercase `signedURL` property is only a relative
      // storage path and must not be used as an image source.
      urls[result.path] = result.signedUrl
    }
  }
  return urls
}

function sanitizeFileName(name: string): string {
  const stripped = name.replace(/[^a-zA-Z0-9._-]/g, '-')
  const trimmed = stripped.replace(/^-+|-+$/g, '')
  return trimmed === '' ? 'image' : trimmed.slice(0, 120)
}

export async function createProject(input: NewProjectInput): Promise<Project> {
  const supabase = getSupabase()
  const userId = await requireAuthenticatedUser()

  const validationError = validateProjectImage(input.image)
  if (validationError) {
    throw new Error(validationError)
  }

  const objectPath = buildImagePath(userId, input.image)

  const { error: uploadError } = await supabase.storage
    .from(PROJECT_IMAGES_BUCKET)
    .upload(objectPath, input.image, {
      contentType: input.image.type,
      cacheControl: '3600',
      upsert: false,
    })

  if (uploadError) {
    throw new Error(uploadError.message)
  }

  const { data, error } = await supabase
    .from('projects')
    .insert({
      name: input.name,
      url: input.url,
      description: input.description,
      platform: input.platform,
      image_path: objectPath,
    })
    .select()
    .single()

  if (error) {
    await supabase.storage.from(PROJECT_IMAGES_BUCKET).remove([objectPath])
    throw new Error(error.message)
  }

  return data
}

async function requireAuthenticatedUser(): Promise<string> {
  const supabase = getSupabase()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    throw new Error(userError.message)
  }
  if (!user) {
    throw new Error('You must be signed in to manage projects.')
  }
  return user.id
}

function buildImagePath(userId: string, file: File): string {
  const extension = file.name.includes('.')
    ? file.name.split('.').pop()!.toLowerCase()
    : ''
  const suffix = extension ? `.${extension}` : ''
  return `${userId}/${crypto.randomUUID()}-${sanitizeFileName(file.name)}${suffix}`
}

export async function updateProject(
  id: string,
  input: UpdateProjectInput
): Promise<{ project: Project; cleanupWarning: string | null }> {
  const supabase = getSupabase()
  const userId = await requireAuthenticatedUser()

  // Fetch the current record through the RLS-scoped select policy so
  // the operation fails as "not found" for missing or foreign IDs
  // and so the previous image path is authoritative.
  const { data: current, error: fetchError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (fetchError) {
    throw new Error(fetchError.message)
  }
  if (!current) {
    throw new Error('Project not found. It may have been deleted.')
  }

  let newImagePath: string | null = null
  if (input.image) {
    const validationError = validateProjectImage(input.image)
    if (validationError) {
      throw new Error(validationError)
    }
    newImagePath = buildImagePath(userId, input.image)

    const { error: uploadError } = await supabase.storage
      .from(PROJECT_IMAGES_BUCKET)
      .upload(newImagePath, input.image, {
        contentType: input.image.type,
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      throw new Error(uploadError.message)
    }
  }

  const { data, error } = await supabase
    .from('projects')
    .update({
      name: input.name,
      url: input.url,
      description: input.description,
      platform: input.platform,
      ...(newImagePath ? { image_path: newImagePath } : {}),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if (newImagePath) {
      await supabase.storage.from(PROJECT_IMAGES_BUCKET).remove([newImagePath])
    }
    if (error.code === 'PGRST116') {
      throw new Error('Project not found. It may have been deleted.')
    }
    throw new Error(error.message)
  }

  if (!data) {
    throw new Error('Unexpected response: the updated project was not returned.')
  }

  let cleanupWarning: string | null = null
  if (newImagePath && current.image_path && current.image_path !== newImagePath) {
    const { error: removeError } = await supabase.storage
      .from(PROJECT_IMAGES_BUCKET)
      .remove([current.image_path])

    if (removeError) {
      cleanupWarning =
        'The project was updated, but the previous thumbnail could not be removed from storage: ' +
        removeError.message +
        ' You can delete it manually in your Supabase Storage dashboard.'
    }
  }

  return { project: data, cleanupWarning }
}

export async function deleteProject(
  id: string
): Promise<MutationResult> {
  const supabase = getSupabase()
  await requireAuthenticatedUser()

  // Fetch through the RLS-scoped select policy first so the image
  // path is authoritative and foreign/missing IDs fail as "not found".
  const { data: current, error: fetchError } = await supabase
    .from('projects')
    .select('image_path')
    .eq('id', id)
    .maybeSingle()

  if (fetchError) {
    throw new Error(fetchError.message)
  }
  if (!current) {
    throw new Error('Project not found. It may have already been deleted.')
  }

  // The delete policy is scoped to auth.uid() = user_id, so a tampered
  // client-side ID cannot delete another user's project.
  const { data: deleted, error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id)
    .select()

  if (error) {
    throw new Error(error.message)
  }
  if (!deleted || deleted.length === 0) {
    throw new Error('Project not found. It may have already been deleted.')
  }

  let cleanupWarning: string | null = null
  if (current.image_path) {
    const { error: removeError } = await supabase.storage
      .from(PROJECT_IMAGES_BUCKET)
      .remove([current.image_path])

    if (removeError) {
      cleanupWarning =
        'The project was deleted, but its thumbnail could not be removed from storage: ' +
        removeError.message +
        ' You can delete it manually in your Supabase Storage dashboard.'
    }
  }

  return { cleanupWarning }
}
