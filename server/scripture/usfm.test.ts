import { describe, expect, it } from 'vitest'
import { cleanInline, parseUsfmBook } from './usfm'

// Fixtures follow the layout of the eBible.org sources: block markers on their
// own line before `\v`, Strong's numbers on words, footnotes inline.
const kjvGenesis = String.raw`\id GEN - King James Version
\h Genesis
\toc1 The First Book of Moses, Called Genesis
\mt1 The First Book of Moses, Called Genesis
\c 1
\p
\v 1 In the \w beginning|strong="H7225"\w* \w God|strong="H0430"\w* created the heaven and the earth.
\v 2 And the earth was without form, and void; and darkness \add was\add* upon the face of the deep.
\p
\v 3 ¶ And God said, Let there be light: and there was light.\f + \fr 1.3 \ft a footnote that must disappear\f*
\c 2
\p
\v 1 Thus the heavens and the earth were finished.
`

const bsbPsalm = String.raw`\id PSA - Berean Standard Bible
\c 23
\s1 The LORD Is My Shepherd
\r (Ezekiel 34:11–24; John 10:1–21)
\d A Psalm of David.
\q1
\v 1 The \nd \+w Lord\+w*\nd* is my shepherd;
\q2 I shall not want.
\q1
\v 2 He makes me lie down in green pastures;
\q2 He leads me beside quiet waters.
\b
\q1
\v 3 He restores my soul;
`

const midVerseBreaks = String.raw`\id ROM - fixture
\c 8
\p
\v 1 There is therefore now no condemnation
\p to them which are in Christ Jesus.
\q1
\v 2 First line,
\q1 second line.
`

describe('parseUsfmBook', () => {
  it('reads the book code and chapters', () => {
    const book = parseUsfmBook(kjvGenesis)
    expect(book.usfm).toBe('GEN')
    expect([...book.chapters.keys()]).toEqual([1, 2])
  })

  it('keeps reader-facing text and drops markup, footnotes and pilcrows', () => {
    const [first, second, third] = parseUsfmBook(kjvGenesis).chapters.get(1)!
    expect(first!.text).toBe('In the beginning God created the heaven and the earth.')
    expect(second!.text).toBe('And the earth was without form, and void; and darkness was upon the face of the deep.')
    expect(third!.text).toBe('And God said, Let there be light: and there was light.')
  })

  it('starts a paragraph at each \\p before a verse', () => {
    const verses = parseUsfmBook(kjvGenesis).chapters.get(1)!
    expect(verses.map((verse) => Boolean(verse.paragraph))).toEqual([true, false, true])
  })

  it('keeps headings, psalm titles and the divine name', () => {
    const [first] = parseUsfmBook(bsbPsalm).chapters.get(23)!
    expect(first).toMatchObject({
      number: 1,
      heading: 'The LORD Is My Shepherd',
      superscription: 'A Psalm of David.',
      paragraph: true,
      poetry: true,
    })
    expect(first!.text).toBe('The LORD is my shepherd;\n\tI shall not want.')
  })

  it('marks every verse that starts a poetic line, and stanza breaks as paragraphs', () => {
    const verses = parseUsfmBook(bsbPsalm).chapters.get(23)!
    expect(verses.map(({ number, poetry, paragraph }) => ({ number, poetry, paragraph }))).toEqual([
      { number: 1, poetry: true, paragraph: true },
      { number: 2, poetry: true, paragraph: undefined },
      { number: 3, poetry: true, paragraph: true },
    ])
    expect(verses[1]!.text).toBe('He makes me lie down in green pastures;\n\tHe leads me beside quiet waters.')
  })

  it('treats breaks inside a verse as continuations of that verse', () => {
    const [first, second] = parseUsfmBook(midVerseBreaks).chapters.get(8)!
    expect(first!.text).toBe('There is therefore now no condemnation to them which are in Christ Jesus.')
    expect(second!.text).toBe('First line,\nsecond line.')
  })
})

describe('cleanInline', () => {
  it('strips word-level attributes and nested markers', () => {
    expect(cleanInline(String.raw`\w grace|strong="G5485"\w* and \+w peace\+w*`)).toBe('grace and peace')
  })

  it('upper-cases the divine name', () => {
    expect(cleanInline(String.raw`the \nd Lord\nd* God`)).toBe('the LORD God')
  })
})
