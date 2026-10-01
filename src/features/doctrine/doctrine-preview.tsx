import { PreviewCard } from '@/components/content/preview-card'
import { ReviewStatusLabel } from '@/components/content/review-notice'
import type { HeadingLevel } from '@/components/typography/heading'
import { MetadataRow } from '@/components/typography/metadata-row'
import { entityHref } from '@/lib/entity-href'
import { formatReference } from '@shared/scripture/reference'
import type { EntityPreview } from '@shared/types/api'

export function DoctrinePreview({ doctrine, headingLevel }: { doctrine: EntityPreview; headingLevel: HeadingLevel }) {
  return (
    <PreviewCard
      href={entityHref(doctrine)}
      title={doctrine.title}
      headingLevel={headingLevel}
      eyebrow={<MetadataRow items={['Doctrine', doctrine.category]} />}
      footer={
        <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <span>
            {doctrine.keyReferences.slice(0, 3).map(formatReference).join(' · ')}
            {!doctrine.hasDetail && <span className="mt-1 block">Summary · full article in preparation</span>}
          </span>
          <ReviewStatusLabel status={doctrine.reviewStatus} />
        </span>
      }
    >
      <p className="line-clamp-3">{doctrine.summary}</p>
    </PreviewCard>
  )
}
