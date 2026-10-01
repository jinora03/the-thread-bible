import type { SearchHit } from '../types/search'
import { findBook } from './books'
import { parseReference, referenceKey } from './reference'

/**
 * "Go to" hits for a query that names a passage ("rom 8:28") or a book ("psalms").
 * Shared so the search palette can offer them instantly, with the same ids the
 * server returns.
 */
export function goToHits(query: string): SearchHit[] {
  const reference = parseReference(query)
  if (reference) return [{ type: 'reference', id: `ref-${referenceKey(reference)}`, reference }]
  const book = findBook(query)
  return book ? [{ type: 'book', id: `book-${book.id}`, bookId: book.id, name: book.name, chapterCount: book.chapterCount }] : []
}
