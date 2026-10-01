import type { EntityKind } from '@shared/types/content'
import type { ContentStore } from './loader'

/**
 * What production (CONTENT_STAGE=published) would actually show. Content is
 * never published automatically: entries are published by recording a
 * completed review in their files. This only reports, so the gap is explicit.
 */
export function productionReadiness(preview: ContentStore, published: ContentStore) {
  const problems: string[] = []
  const lines: string[] = []

  const byKind = new Map<EntityKind, { all: number; published: number }>()
  for (const entity of preview.entities.values()) {
    const counts = byKind.get(entity.kind) ?? { all: 0, published: 0 }
    counts.all++
    if (published.entities.has(entity.id)) counts.published++
    byKind.set(entity.kind, counts)
  }
  for (const [kind, counts] of [...byKind].sort(([a], [b]) => a.localeCompare(b))) lines.push(`${kind}: ${counts.published} of ${counts.all} published`)
  lines.push(`connections: ${published.connections.length} of ${preview.connections.length} shown`)
  lines.push(`chapter notes: ${published.chapterNotes.length} of ${preview.chapterNotes.length} published`)
  lines.push(`threads: ${published.threads.size} of ${preview.threads.size} published`)

  if (published.entities.size === 0) problems.push('No entries are published, so production would show no study content at all.')
  const { home } = published
  if (!published.entities.has(home.featuredStudyId)) problems.push(`The home page's featured study (${home.featuredStudyId}) is not published, so the home page would leave it out.`)
  if (!published.threads.has(home.featuredThreadId)) problems.push(`The home page's featured thread (${home.featuredThreadId}) is not published.`)
  const hiddenThemes = home.themeIds.filter((id) => !published.entities.has(id))
  if (hiddenThemes.length > 0) problems.push(`${hiddenThemes.length} of the home page's ${home.themeIds.length} themes are not published.`)

  return { ready: problems.length === 0, lines, problems }
}
