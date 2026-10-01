import { PreviewCard } from '@/components/content/preview-card'
import { ReviewStatusLabel } from '@/components/content/review-notice'
import type { HeadingLevel } from '@/components/typography/heading'
import { MetadataRow } from '@/components/typography/metadata-row'
import { entityHref } from '@/lib/entity-href'
import type { EntityPreview } from '@shared/types/api'

export function StudyPreview({ study, headingLevel }: { study: EntityPreview; headingLevel: HeadingLevel }) {
  return (
    <PreviewCard
      href={entityHref(study)}
      title={study.title}
      headingLevel={headingLevel}
      eyebrow={
        <MetadataRow
          items={['Study', study.sections?.length ? `${study.sections.length} parts` : 'In preparation', study.readingMinutes && `${study.readingMinutes} min`]}
        />
      }
      footer={<ReviewStatusLabel status={study.reviewStatus} />}
    >
      <p className="line-clamp-3">{study.summary}</p>
    </PreviewCard>
  )
}
