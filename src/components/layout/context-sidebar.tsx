import { useId } from 'react'
import { PanelRightClose } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface ContextSidebarProps {
  title: string
  onCollapse?: () => void
  children: React.ReactNode
}

/**
 * Sticky, independently scrolling side panel for contextual study material.
 * Sits below the reader toolbar (3.5rem) and fills the remaining viewport.
 */
export function ContextSidebar({ title, onCollapse, children }: ContextSidebarProps) {
  const titleId = useId()
  return (
    <aside aria-labelledby={titleId} className="sticky top-14 flex h-[calc(100dvh-3.5rem)] flex-col">
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b pr-2 pl-5">
        <h2 id={titleId} className="eyebrow">
          {title}
        </h2>
        {onCollapse && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onCollapse} aria-label="Hide study panel">
                <PanelRightClose />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Hide study panel</TooltipContent>
          </Tooltip>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
    </aside>
  )
}
