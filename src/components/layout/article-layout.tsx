import { PageContainer } from '@/components/layout/page-container'
import { cn } from '@/lib/utils'

interface ArticleLayoutProps {
  children: React.ReactNode
  /** Optional sidebar (e.g. "On this page"), shown beside the article on wide screens only. */
  aside?: React.ReactNode
  asideLabel?: string
  className?: string
}

/**
 * Long-form editorial layout: one controlled-width column, with an optional
 * sticky aside on extra-large screens. The article stays visually dominant.
 */
export function ArticleLayout({ children, aside, asideLabel, className }: ArticleLayoutProps) {
  return (
    <PageContainer className={cn('py-10 sm:py-14 lg:py-20', className)}>
      <div
        className={cn(
          'mx-auto',
          aside ? 'max-w-article xl:grid xl:max-w-[calc(52rem+4rem+15rem)] xl:grid-cols-[minmax(0,52rem)_15rem] xl:gap-16' : 'max-w-article',
        )}
      >
        <article className="min-w-0">{children}</article>
        {aside && (
          <aside aria-label={asideLabel} className="hidden xl:block">
            <div className="sticky top-10">{aside}</div>
          </aside>
        )}
      </div>
    </PageContainer>
  )
}
