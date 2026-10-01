import { cn } from '@/lib/utils'

interface ReadingLayoutProps {
  /** Book/chapter navigation, shown as a left column on extra-large screens. */
  navigation?: React.ReactNode
  /** Contextual panel, shown as a right column from large screens when open. */
  context?: React.ReactNode
  contextOpen: boolean
  children: React.ReactNode
}

/**
 * Three-column reading frame: navigation | Scripture | context.
 * Columns collapse by breakpoint with CSS only; smaller screens reach the
 * same tools through sheets supplied by the page.
 */
export function ReadingLayout({ navigation, context, contextOpen, children }: ReadingLayoutProps) {
  return (
    <div
      className={cn(
        'mx-auto grid max-w-[100rem] grid-cols-1',
        contextOpen
          ? 'lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[15rem_minmax(0,1fr)_21rem]'
          : 'xl:grid-cols-[15rem_minmax(0,1fr)]',
      )}
    >
      {navigation && <div className="hidden border-r xl:block">{navigation}</div>}
      <div className="min-w-0">{children}</div>
      {contextOpen && context && <div className="hidden border-l lg:block">{context}</div>}
    </div>
  )
}
