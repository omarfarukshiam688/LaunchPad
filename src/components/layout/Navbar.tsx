import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { Button } from '../ui/Button'
import { IconChevronDown, IconLogOut, IconMoon, IconPlus, IconSearch, IconSun, IconX } from '../ui/Icons'
import { Logo } from '../ui/Logo'

interface NavbarProps {
  searchValue: string
  onSearchChange: (value: string) => void
  onAddProject: () => void
}

function AccountMenu() {
  const { user, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  if (!user) {
    return null
  }

  const email = user.email ?? 'Account'
  const localPart = email.split('@')[0] ?? 'u'
  const initials = localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')

  const handleSignOut = async () => {
    setSigningOut(true)
    try {
      await signOut()
    } finally {
      setSigningOut(false)
      setOpen(false)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex h-9 items-center gap-2 rounded-lg border border-border bg-surface py-1 pl-1 pr-2 transition-colors hover:border-border-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent-soft text-[11px] font-semibold text-accent">
          {initials || email.charAt(0).toUpperCase()}
        </span>
        <span className="hidden max-w-36 truncate text-[13px] font-medium text-ink sm:block">
          {email}
        </span>
        <IconChevronDown
          size={14}
          className={`text-ink-3 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Account"
          className="animate-fade-in absolute right-0 top-full z-40 mt-2 w-64 overflow-hidden rounded-xl border border-border bg-surface shadow-xl shadow-black/25"
        >
          <div className="border-b border-border px-4 py-3">
            <p className="truncate text-[13px] font-medium text-ink">{email}</p>
            <p className="mt-0.5 text-xs text-ink-3">Personal workspace</p>
          </div>
          <div className="p-1.5">
            <button
              type="button"
              role="menuitem"
              onClick={handleSignOut}
              disabled={signingOut}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-danger/90 transition-colors hover:bg-danger/10 hover:text-danger disabled:cursor-not-allowed disabled:opacity-55"
            >
              <IconLogOut size={16} />
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-ink-2 transition-colors hover:border-border-strong hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
    >
      {isDark ? <IconSun size={17} /> : <IconMoon size={17} />}
    </button>
  )
}

export function Navbar({ searchValue, onSearchChange, onAddProject }: NavbarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-canvas/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:gap-4 sm:px-6 lg:px-8">
        <a
          href="/"
          aria-label="Launchpad home"
          className="shrink-0 rounded-lg transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <Logo size={28} />
        </a>

        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <IconSearch
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"
          />
          <input
            type="search"
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search projects…"
            aria-label="Search projects"
            className="h-9 w-full rounded-lg border border-border bg-surface pl-9 pr-8 text-[13px] text-ink placeholder:text-ink-3 transition-colors hover:border-border-strong focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus [&::-webkit-search-cancel-button]:cursor-pointer"
          />
          {searchValue && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-ink-3 hover:text-ink"
            >
              <IconX size={13} />
            </button>
          )}
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <Button
            size="sm"
            onClick={onAddProject}
            className="hidden sm:inline-flex"
            aria-label="Add new project"
          >
            <IconPlus size={15} />
            Add New Project
          </Button>
          <Button
            size="sm"
            onClick={onAddProject}
            aria-label="Add new project"
            className="sm:hidden"
          >
            <IconPlus size={15} />
            <span className="sr-only">Add New Project</span>
          </Button>
          <AccountMenu />
        </div>
      </div>
    </header>
  )
}
