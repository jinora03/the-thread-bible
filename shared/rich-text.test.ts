import { describe, expect, it } from 'vitest'
import { parseRichText, richTextToPlain } from './rich-text'

describe('parseRichText', () => {
  it('splits prose into text, references and entity links', () => {
    expect(parseRichText('Behold [[John 1:29|the Lamb]], as in [[Genesis 22:8]] and the [[theme:covenant]].')).toEqual([
      { type: 'text', text: 'Behold ' },
      { type: 'reference', reference: { book: 'john', chapter: 1, verse: 29 }, label: 'the Lamb' },
      { type: 'text', text: ', as in ' },
      { type: 'reference', reference: { book: 'genesis', chapter: 22, verse: 8 }, label: undefined },
      { type: 'text', text: ' and the ' },
      { type: 'entity', id: 'theme:covenant', label: undefined },
      { type: 'text', text: '.' },
    ])
  })

  it('returns plain text untouched', () => {
    expect(parseRichText('No tokens here.')).toEqual([{ type: 'text', text: 'No tokens here.' }])
  })

  it('degrades unknown tokens to their label or target', () => {
    expect(parseRichText('[[Hezekiah 1:1]]')).toEqual([{ type: 'text', text: 'Hezekiah 1:1' }])
    expect(parseRichText('[[not-a-kind:thing|a label]]')).toEqual([{ type: 'text', text: 'a label' }])
  })
})

describe('richTextToPlain', () => {
  it('keeps labels and targets, drops the brackets', () => {
    expect(richTextToPlain('See [[John 1:29|the Lamb]] and [[Romans 8:28]].')).toBe('See the Lamb and Romans 8:28.')
  })
})
