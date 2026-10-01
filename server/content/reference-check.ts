import { parseRichText } from '@shared/rich-text'
import { formatReference } from '@shared/scripture/reference'
import type { ScriptureReference } from '@shared/types/scripture'
import type { VerseIndex } from '../scripture/verse-index'
import type { ContentStore } from './loader'

/** Every Scripture reference in a value: structured references, and [[...]] tokens in prose. */
export function referencesIn(value: unknown): ScriptureReference[] {
  if (typeof value === 'string') return parseRichText(value).flatMap((node) => (node.type === 'reference' ? [node.reference] : []))
  if (Array.isArray(value)) return value.flatMap(referencesIn)
  if (value && typeof value === 'object') {
    const candidate = value as Partial<ScriptureReference>
    if (typeof candidate.book === 'string' && typeof candidate.chapter === 'number') return [candidate as ScriptureReference]
    return Object.values(value).flatMap(referencesIn)
  }
  return []
}

/** Each piece of loaded content with a label a writer can find it by. */
export function contentItems(store: ContentStore): { label: string; value: unknown }[] {
  return [
    ...[...store.entities.values()].map((entity) => ({ label: entity.id, value: entity })),
    ...store.connections.map((connection) => ({ label: `connection ${connection.id}`, value: connection })),
    ...store.chapterNotes.map((note) => ({ label: `chapter note ${note.bookId} ${note.chapter}`, value: note })),
    ...[...store.threads.values()].map((thread) => ({ label: `thread ${thread.id}`, value: thread })),
    { label: 'site/home.yaml', value: store.home },
  ]
}

/**
 * Checks references against the imported Bible text. A verse that exists in
 * no translation is an error; one that a translation omits (some leave out
 * verses others include) is a note, since the reader then shows a gap.
 */
export function checkReferenceAvailability(items: { label: string; value: unknown }[], verses: VerseIndex) {
  const errors: string[] = []
  const notes: string[] = []
  const translationCount = verses.translations().length
  for (const { label, value } of items) {
    const seen = new Set<string>()
    for (const reference of referencesIn(value)) {
      const text = formatReference(reference)
      if (seen.has(text)) continue
      seen.add(text)
      const problem = verses.problem(reference)
      if (problem) {
        errors.push(`${label}: ${text} (${problem})`)
        continue
      }
      const missing = verses.missingIn(reference)
      if (missing.length > 0 && missing.length < translationCount) notes.push(`${label}: ${text} is not in ${missing.join(', ').toUpperCase()}`)
    }
  }
  return { errors, notes }
}
