import type { HighlightSegment } from '@shared/types/search'

/**
 * Turns reader input into a safe FTS5 MATCH expression.
 * - words become prefix terms: `lamb` → `"lamb"*` (matches lambs, lamb's…)
 * - "quoted phrases" stay phrases
 * - FTS operators and punctuation in the input are never interpreted
 * Returns null when nothing searchable remains.
 */
export function toFtsQuery(input: string): string | null {
  const terms: string[] = []
  const phrasePattern = /"([^"]+)"/g
  for (const [, phrase = ''] of input.matchAll(phrasePattern)) {
    const words = tokenize(phrase)
    if (words.length > 0) terms.push(`"${words.join(' ')}"`)
  }
  for (const word of significantWords(tokenize(input.replace(phrasePattern, ' ')))) terms.push(`"${word}"*`)
  return terms.length > 0 ? terms.join(' ') : null
}

// Function words match nearly every verse; they only narrow a search inside "quotes".
const stopWords = new Set(['a', 'an', 'and', 'as', 'at', 'be', 'by', 'for', 'in', 'is', 'it', 'of', 'on', 'or', 'the', 'to', 'unto'])

/** Drops function words, unless they are all the reader typed. */
export function significantWords(words: string[]): string[] {
  const kept = words.filter((word) => !stopWords.has(word))
  return kept.length > 0 ? kept : words
}

function tokenize(text: string): string[] {
  return (
    text
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      // Keep letters and digits only; apostrophes split words the way FTS5 does.
      .split(/[^\p{L}\p{N}]+/u)
      .filter((word) => word.length > 0)
      .slice(0, 12)
  )
}

// Private-use sentinels for snippet() so matches can be split out safely.
export const MATCH_START = '\u{E000}'
export const MATCH_END = '\u{E001}'

/** Converts an FTS snippet with sentinel markers into plain segments. */
export function toSegments(snippet: string): HighlightSegment[] {
  const segments: HighlightSegment[] = []
  const pattern = new RegExp(`${MATCH_START}([\\s\\S]*?)${MATCH_END}`, 'g')
  let cursor = 0
  for (const match of snippet.matchAll(pattern)) {
    if (match.index > cursor) segments.push({ text: snippet.slice(cursor, match.index), match: false })
    segments.push({ text: match[1] ?? '', match: true })
    cursor = match.index + match[0].length
  }
  if (cursor < snippet.length) segments.push({ text: snippet.slice(cursor), match: false })
  return segments
    .map((segment) => ({ ...segment, text: segment.text.replace(/\s*\n\t?\s*/g, ' ') }))
    .filter((segment) => segment.text.length > 0)
}

/** Highlights query terms in text we did not get from FTS (e.g. API results, titles). */
export function highlightTerms(text: string, query: string): HighlightSegment[] {
  const words = significantWords(tokenize(query))
  if (words.length === 0) return [{ text, match: false }]
  const escaped = words.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const pattern = new RegExp(`\\b(${escaped.join('|')})[\\p{L}\\p{N}]*`, 'giu')
  const segments: HighlightSegment[] = []
  let cursor = 0
  for (const match of text.matchAll(pattern)) {
    if (match.index > cursor) segments.push({ text: text.slice(cursor, match.index), match: false })
    segments.push({ text: match[0], match: true })
    cursor = match.index + match[0].length
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), match: false })
  return segments
}
