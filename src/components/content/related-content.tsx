import { Link } from 'react-router'
import { Heading, type HeadingLevel } from '@/components/typography/heading'
import { SectionHeading } from '@/components/typography/section-heading'
import { entityKindLabels } from '@/config/explore'
import { entityHref } from '@/lib/entity-href'
import { cn } from '@/lib/utils'
import type { EntitySummary } from '@shared/types/content'

interface RelatedContentProps {
  title: string
  entities: EntitySummary[]
  id?: string
  headingLevel?: HeadingLevel
  description?: string
  className?: string
}

/**
 * "Related" lists at the foot of a page. Typographic rows separated by hairlines,
 * each entry is a link, not a card.
 */
export function RelatedContent({ title, entities, id, headingLevel = 2, description, className }: RelatedContentProps) {
  if (entities.length === 0) return null
  const itemLevel = Math.min(headingLevel + 1, 6) as HeadingLevel

  return (
    <section aria-labelledby={id} className={className}>
      <SectionHeading id={id} level={headingLevel} title={title} description={description} />
      <ul className="mt-6 grid gap-x-10 sm:grid-cols-2">
        {entities.map((entity) => (
          <li key={entity.id} className="border-t py-4">
            <p className="eyebrow">{entityKindLabels[entity.kind]}</p>
            <Heading level={itemLevel} variant="item" className="mt-1.5">
              <Link to={entityHref(entity)} className="hover:text-primary dark:hover:text-reference">
                {entity.title}
              </Link>
            </Heading>
            <p className={cn('mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground')}>{entity.summary}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
