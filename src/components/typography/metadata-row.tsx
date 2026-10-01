import { Fragment } from 'react'
import { cn } from '@/lib/utils'

interface MetadataRowProps {
  items: React.ReactNode[]
  className?: string
}

/** Restrained metadata line: PROPHECY · FOURTH SERVANT SONG · ISAIAH */
export function MetadataRow({ items, className }: MetadataRowProps) {
  const visible = items.filter(Boolean)
  if (visible.length === 0) return null

  return (
    <p className={cn('eyebrow flex flex-wrap items-center gap-x-2 gap-y-1', className)}>
      {visible.map((item, index) => (
        <Fragment key={index}>
          {index > 0 && (
            <span aria-hidden="true" className="text-border">
              ·
            </span>
          )}
          <span>{item}</span>
        </Fragment>
      ))}
    </p>
  )
}
