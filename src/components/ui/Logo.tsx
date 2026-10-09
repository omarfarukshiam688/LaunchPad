import { IconRocket } from './Icons'

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <IconRocket size={size * 0.62} strokeWidth={2.2} />
    </span>
  )
}

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={size} />
      <span
        className="font-semibold tracking-tight text-ink"
        style={{ fontSize: size * 0.6 }}
      >
        Launchpad
      </span>
    </span>
  )
}
