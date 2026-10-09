import { useState, type ReactNode } from 'react'
import type { Project } from '../../lib/database.types'
import { IconExternalLink, IconGlobe, IconImage } from '../ui/Icons'

interface ProjectCardProps {
  project: Project
  imageUrl: string | null
  index?: number
  actions?: ReactNode
}

export function ProjectCard({
  project,
  imageUrl,
  index = 0,
  actions,
}: ProjectCardProps) {
  const [imageFailed, setImageFailed] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const showImage = Boolean(imageUrl) && !imageFailed

  return (
    <a
      href={project.url}
      target="_blank"
      rel="noopener noreferrer"
      className="card-ring group flex h-full animate-fade-in flex-col overflow-hidden rounded-2xl border border-border bg-surface transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-border-strong hover:shadow-xl hover:shadow-black/20"
      style={{ animationDelay: `${Math.min(index, 12) * 30}ms` }}
      aria-label={`Open ${project.name} in a new tab`}
    >
      <div className="relative aspect-[16/10] overflow-hidden border-b border-border bg-surface-2">
        {showImage ? (
          <>
            {!imageLoaded && (
              <span className="absolute inset-0 flex items-center justify-center text-ink-3">
                <IconImage size={28} />
              </span>
            )}
            <img
              src={imageUrl ?? undefined}
              alt={`${project.name} thumbnail`}
              loading="lazy"
              onError={() => setImageFailed(true)}
              onLoad={() => setImageLoaded(true)}
              className={`h-full w-full object-cover transition-all duration-300 ease-out group-hover:scale-[1.03] ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            />
          </>
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-ink-3">
            <IconImage size={28} />
          </span>
        )}

        {project.platform ? (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/90 px-2.5 py-1 text-[11px] font-medium text-ink-2 backdrop-blur-sm">
            <IconGlobe size={11} />
            {project.platform}
          </span>
        ) : null}

        <span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface/90 text-ink-2 opacity-0 backdrop-blur-sm transition-all duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
          <IconExternalLink size={14} />
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="truncate text-[15px] font-semibold tracking-tight text-ink">
          {project.name}
        </h3>

        {project.description ? (
          <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-ink-2">
            {project.description}
          </p>
        ) : null}

        <div className="mt-auto flex items-center justify-between pt-4">
          <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-3 transition-colors group-hover:text-accent">
            Open project
            <IconExternalLink
              size={13}
              className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </span>
          {actions ? (
            <div
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  event.stopPropagation()
                }
              }}
              className="flex items-center gap-1"
            >
              {actions}
            </div>
          ) : null}
        </div>
      </div>
    </a>
  )
}
