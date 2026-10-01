import { afterAll, describe, expect, it } from 'vitest'
import { createDatabase } from '../db/client'
import { paths } from '../paths'
import { importUsfmBooks, rebuildSearchIndex } from '../scripture/import'
import { createVerseIndex } from '../scripture/verse-index'
import { loadContent } from './loader'
import { productionReadiness } from './readiness'
import { checkReferenceAvailability, referencesIn } from './reference-check'

// John 1 with three verses in one translation, and one of them missing in the other.
const database = createDatabase(':memory:')
importUsfmBooks(database.sqlite, 'kjv', [String.raw`\id JHN
\c 1
\p
\v 1 In the beginning was the Word.
\v 29 Behold the Lamb of God.
\v 36 Behold the Lamb of God!`])
importUsfmBooks(database.sqlite, 'bsb', [String.raw`\id JHN
\c 1
\p
\v 1 In the beginning was the Word.
\v 29 Look, the Lamb of God.`])
rebuildSearchIndex(database.sqlite)
const verses = createVerseIndex(database.sqlite)
afterAll(() => database.sqlite.close())

describe('referencesIn', () => {
  it('finds structured references and tokens in prose, at any depth', () => {
    const found = referencesIn({ keyReferences: [{ book: 'john', chapter: 1, verse: 1 }], body: ['See [[John 1:29|the Lamb]].'] })
    expect(found).toEqual([
      { book: 'john', chapter: 1, verse: 1 },
      { book: 'john', chapter: 1, verse: 29 },
    ])
  })
})

describe('checkReferenceAvailability', () => {
  it('reports verses past the end of a chapter as errors', () => {
    const { errors } = checkReferenceAvailability([{ label: 'theme:light', value: 'Compare [[John 1:40]].' }], verses)
    expect(errors).toEqual(['theme:light: John 1:40 (John 1 has 36 verses)'])
  })

  it('notes verses that a translation omits, without failing', () => {
    const { errors, notes } = checkReferenceAvailability([{ label: 'theme:light', value: { reference: { book: 'john', chapter: 1, verse: 36 } } }], verses)
    expect(errors).toEqual([])
    expect(notes).toEqual(['theme:light: John 1:36 is not in BSB'])
  })

  it('cannot judge chapters with no imported text, so stays quiet', () => {
    const { errors } = checkReferenceAvailability([{ label: 'theme:light', value: '[[Romans 8:28]]' }], verses)
    expect(errors).toEqual([])
  })
})

describe('productionReadiness', () => {
  it('reports, rather than hides, that nothing is published yet', () => {
    const preview = loadContent(paths.content, 'preview')
    const published = loadContent(paths.content, 'published')
    const readiness = productionReadiness(preview, published)
    if (published.entities.size === 0) {
      expect(readiness.ready).toBe(false)
      expect(readiness.problems[0]).toMatch(/No entries are published/)
    }
    expect(readiness.lines.some((line) => /^doctrine: \d+ of \d+ published$/.test(line))).toBe(true)
  })
})
