import { entityKindLabels } from '@/config/explore'
import { entityHref } from '@/lib/entity-href'
import { chapterHref, formatReference, referenceHref } from '@shared/scripture/reference'
import type { SearchHit } from '@shared/types/search'

export function hitHref(hit: SearchHit): string {
  switch (hit.type) {
    case 'reference':
    case 'verse':
      return referenceHref(hit.reference)
    case 'book':
      return chapterHref(hit.bookId, 1)
    case 'entity':
      return entityHref(hit.entity)
  }
}

export function hitTitle(hit: SearchHit): string {
  switch (hit.type) {
    case 'reference':
    case 'verse':
      return formatReference(hit.reference)
    case 'book':
      return hit.name
    case 'entity':
      return hit.entity.title
  }
}

export function hitMeta(hit: SearchHit): string | undefined {
  switch (hit.type) {
    case 'reference':
      return 'Open in the reader'
    case 'book':
      return `${hit.chapterCount} chapters`
    case 'entity':
      return [entityKindLabels[hit.entity.kind], hit.entity.subtitle, hit.entity.reviewStatus !== 'published' ? 'In review' : undefined]
        .filter(Boolean)
        .join(' · ')
    default:
      return undefined
  }
}
