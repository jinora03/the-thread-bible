import { describe, expect, it } from 'vitest'
import { highlightTerms, MATCH_END, MATCH_START, significantWords, toFtsQuery, toSegments } from './fts'

describe('toFtsQuery', () => {
  it('turns words into prefix terms', () => {
    expect(toFtsQuery('lamb blood')).toBe('"lamb"* "blood"*')
  })

  it('keeps quoted phrases, stopwords included', () => {
    expect(toFtsQuery('"lamb of god" slain')).toBe('"lamb of god" "slain"*')
  })

  it('drops function words outside quotes', () => {
    expect(toFtsQuery('the lamb of god')).toBe('"lamb"* "god"*')
  })

  it('keeps function words when they are all the reader typed', () => {
    expect(toFtsQuery('in the')).toBe('"in"* "the"*')
  })

  it('never passes FTS syntax through', () => {
    expect(toFtsQuery('lamb NEAR NOT* (god) ^col:x')).toBe('"lamb"* "near"* "not"* "god"* "col"* "x"*')
    expect(toFtsQuery('"unclosed')).toBe('"unclosed"*')
  })

  it('folds accents and splits on apostrophes', () => {
    expect(toFtsQuery('Café lamb’s')).toBe('"cafe"* "lamb"* "s"*')
  })

  it('returns null when nothing is searchable', () => {
    expect(toFtsQuery('  -- !! ')).toBeNull()
    expect(toFtsQuery('""')).toBeNull()
  })
})

describe('significantWords', () => {
  it('filters stopwords unless nothing would remain', () => {
    expect(significantWords(['love', 'of', 'god'])).toEqual(['love', 'god'])
    expect(significantWords(['of', 'the'])).toEqual(['of', 'the'])
  })
})

describe('toSegments', () => {
  it('splits sentinel-marked snippets into plain segments', () => {
    const snippet = `Behold the ${MATCH_START}Lamb${MATCH_END} of ${MATCH_START}God${MATCH_END}`
    expect(toSegments(snippet)).toEqual([
      { text: 'Behold the ', match: false },
      { text: 'Lamb', match: true },
      { text: ' of ', match: false },
      { text: 'God', match: true },
    ])
  })

  it('flattens poetic line breaks and never produces empty segments', () => {
    expect(toSegments(`${MATCH_START}shepherd${MATCH_END};\n\tI shall`)).toEqual([
      { text: 'shepherd', match: true },
      { text: '; I shall', match: false },
    ])
  })

  it('treats markup-like text as plain text', () => {
    expect(toSegments('<b>not html</b>')).toEqual([{ text: '<b>not html</b>', match: false }])
  })
})

describe('highlightTerms', () => {
  it('highlights whole words that start with a query term', () => {
    expect(highlightTerms('The lambs of God', 'lamb of')).toEqual([
      { text: 'The ', match: false },
      { text: 'lambs', match: true },
      { text: ' of God', match: false },
    ])
  })

  it('escapes regex characters in the query', () => {
    expect(highlightTerms('a+b', '.*')).toEqual([{ text: 'a+b', match: false }])
  })
})
