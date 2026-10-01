import { PreviewCard } from '@/components/content/preview-card'
import { ReviewStatusLabel } from '@/components/content/review-notice'
import type { HeadingLevel } from '@/components/typography/heading'
import { MetadataRow } from '@/components/typography/metadata-row'
import { entityHref } from '@/lib/entity-href'
import { formatReference } from '@shared/scripture/reference'
import type { EntityPreview } from '@shared/types/api'

export function ProphecyPreview({ prophecy, headingLevel }: { prophecy: EntityPreview; headingLevel: HeadingLevel }) {
  return (
    <PreviewCard
      href={entityHref(prophecy)}
      title={prophecy.title}
      headingLevel={headingLevel}
      eyebrow={<MetadataRow items={['Prophecy', prophecy.passage && formatReference(prophecy.passage)]} />}
      footer={
        <span className="flex flex-wrap items-baseline justify-between gap-x-3">
          <span>{!prophecy.hasDetail && 'Summary · full study in preparation'}</span>
          <ReviewStatusLabel status={prophecy.reviewStatus} />
        </span>
      }
    >
      <p className="line-clamp-3">{prophecy.summary}</p>
    </PreviewCard>
  )
}
