import { cn } from '@/lib/utils'

/** The mark: one thread passing through three points: Scripture connecting to Scripture. */
export function ThreadMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={cn('size-5', className)}>
      <path
        d="M5 4c7 0 14 4 7 8s0 8 7 8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        className="text-primary dark:text-reference"
      />
      <circle cx="5" cy="4" r="2" className="fill-thread" />
      <circle cx="12" cy="12" r="2" className="fill-thread" />
      <circle cx="19" cy="20" r="2" className="fill-thread" />
    </svg>
  )
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5 text-foreground', className)}>
      <ThreadMark />
      <span className="font-serif text-[1.1875rem] leading-none tracking-[-0.01em]">The Thread Bible</span>
    </span>
  )
}
