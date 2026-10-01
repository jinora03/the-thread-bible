import { referenceIncludesVerse } from '@shared/scripture/reference'
import type { ChapterStudyResponse } from '@shared/types/api'
import type { ConnectionView } from '@shared/types/connections'
import type { BookId, ScriptureReference } from '@shared/types/scripture'

/** Connections whose chapter-side endpoint includes the given verse. */
export function connectionsForVerse(study: ChapterStudyResponse | undefined, bookId: BookId, chapter: number, verse: number): ConnectionView[] {
  return (study?.connections ?? []).filter(
    ({ here }) => here.type === 'scripture' && referenceIncludesVerse(here.reference, bookId, chapter, verse),
  )
}

export function crossReferencesForVerse(study: ChapterStudyResponse | undefined, verse: number): ScriptureReference[] {
  return study?.context?.crossReferences.find((entry) => entry.verse === verse)?.references ?? []
}

const startKey = (reference: ScriptureReference) => `${reference.book}.${reference.chapter}.${reference.verse ?? ''}`

/**
 * Curated cross-references and connections often point at the same passage;
 * prefer the connection (it carries a type), matching on the starting verse.
 */
export function referencesForVerse(study: ChapterStudyResponse | undefined, bookId: BookId, chapter: number, verse: number) {
  const connections = connectionsForVerse(study, bookId, chapter, verse)
  const connected = new Set(connections.flatMap(({ there }) => (there.type === 'scripture' ? [startKey(there.reference)] : [])))
  const plain = crossReferencesForVerse(study, verse).filter((reference) => !connected.has(startKey(reference)))
  return { connections, plain }
}
