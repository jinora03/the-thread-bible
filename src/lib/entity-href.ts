import { getCollectionForKind } from '@/config/explore'
import type { Entity, EntityKind } from '@shared/types/content'

export function entityHref(entity: Pick<Entity, 'kind' | 'slug'>): string {
  return entityHrefFor(entity.kind, entity.slug)
}

export function entityHrefFor(kind: EntityKind, slug: string): string {
  if (kind === 'study') return `/studies/${slug}`
  const collection = getCollectionForKind(kind)
  return collection ? `/explore/${collection.slug}/${slug}` : '/explore'
}
