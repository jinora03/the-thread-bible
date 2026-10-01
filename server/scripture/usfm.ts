import type { Verse } from '@shared/types/scripture'

export interface ParsedBook {
  usfm: string
  chapters: Map<number, Verse[]>
}

// Paragraph-level markers that start a new prose block.
const proseBlocks = new Set(['p', 'm', 'pmo', 'pm', 'pmc', 'pmr', 'pi', 'pi1', 'pi2', 'pi3', 'mi', 'cls', 'li', 'li1', 'li2', 'li3', 'pc', 'po'])
// Poetic line markers; the number is the indent level.
const poetryLines = /^q([1-4])?$|^q[rcm]\d?$/
const headingMarkers = new Set(['s', 's1', 's2', 's3', 's4', 'ms', 'ms1', 'ms2', 'ms3', 'sp'])
// Book-introduction and metadata markers, ignored entirely.
const ignoredMarkers = /^(id|ide|h|toc\d?|toca\d?|mt\d?|mte\d?|imt\d?|is\d?|ip|ipi|im|imi|ipq|imq|ipr|iq\d?|ib|ili\d?|iot|io\d?|ior|iex|ie|rem|sts|cl|cp|r|mr|sr|restore)$/

/**
 * Strips USFM character markup, keeping the reader-facing text.
 * - `\w word|strong="H1"\w*` → word
 * - `\nd Lord\nd*` → LORD (the divine name, rendered as small caps by the UI)
 * - footnotes, cross-references and alternate verse numbers are removed
 */
export function cleanInline(input: string): string {
  return input
    .replace(/\\\+?w\s+([^|\\]*?)(?:\|[^\\]*?)?\\\+?w\*/g, '$1')
    .replace(/\\\+?nd\s+([\s\S]*?)\\\+?nd\*/g, (_match, inner: string) => inner.toUpperCase())
    .replace(/\\\+?(?:ca|va|vp)\s[\s\S]*?\\\+?(?:ca|va|vp)\*/g, '')
    .replace(/\\\+?[a-z]+\d*\*/g, '')
    .replace(/\\\+?[a-z]+\d*\s?/g, '')
    .replace(/¶\s*/g, '')
    .replace(/[  ]{2,}/g, ' ')
}

/** Removes notes that can span lines before line-by-line parsing. */
function removeNotes(text: string): string {
  return text.replace(/\\(f|fe|x|ef|ex)\s[\s\S]*?\\\1\*/g, '')
}

/**
 * Parses one USFM book into chapters of verses, keeping paragraph breaks,
 * section headings and poetic line breaks (`\n`, with `\t` for indented lines).
 */
export function parseUsfmBook(source: string): ParsedBook {
  const chapters = new Map<number, Verse[]>()
  let usfm = ''
  let chapter = 0
  let current: Verse | undefined
  let pendingParagraph = true
  let pendingHeadings: string[] = []
  let pendingSuperscription = ''
  // The last paragraph or poetic-line marker. It belongs to whatever follows:
  // a new verse (which then starts the paragraph or line) or more text of the
  // current verse (a break inside the verse).
  let pendingBlock: { poetry: boolean; indent: number } | undefined

  const finishVerse = () => {
    if (!current) return
    current.text = current.text.replace(/[ ]+\n/g, '\n').replace(/\n[ ]+/g, '\n').replace(/\s+$/, '').replace(/^ +/, '')
    current = undefined
  }

  const append = (raw: string) => {
    if (!current) return
    const text = cleanInline(raw)
    if (!text.trim()) return
    const needsSpace = current.text.length > 0 && !/[\n\t ]$/.test(current.text) && !/^[,.;:!?’”)]/.test(text.trimStart())
    current.text += (needsSpace ? ' ' : '') + text.trim()
  }

  const startVerse = (number: number) => {
    finishVerse()
    const poetry = pendingBlock?.poetry === true
    const verse: Verse = { number, text: poetry && pendingBlock!.indent > 1 ? '\t' : '' }
    if (pendingParagraph || (pendingBlock && !poetry)) verse.paragraph = true
    if (pendingHeadings.length > 0) verse.heading = pendingHeadings.join(': ')
    if (pendingSuperscription) verse.superscription = pendingSuperscription
    if (poetry) verse.poetry = true
    pendingParagraph = false
    pendingHeadings = []
    pendingSuperscription = ''
    pendingBlock = undefined
    current = verse
    const list = chapters.get(chapter) ?? []
    list.push(verse)
    chapters.set(chapter, list)
  }

  /** Text before any `\v` continues the current verse, after any pending break. */
  const continueVerse = (raw: string) => {
    if (!current || !cleanInline(raw).trim()) return
    if (pendingBlock?.poetry) {
      current.text += pendingBlock.indent > 1 ? '\n\t' : '\n'
      current.poetry = true
    }
    // A paragraph break inside a verse cannot split it; the verse simply continues.
    pendingBlock = undefined
    append(raw)
  }

  /** Handles text that may contain inline `\v N` markers. */
  const processText = (text: string) => {
    const parts = text.split(/\\v\s+(\d+)[a-z]?(?:-\d+)?\s*/)
    continueVerse(parts[0] ?? '')
    for (let index = 1; index < parts.length; index += 2) {
      startVerse(Number(parts[index]))
      append(parts[index + 1] ?? '')
    }
  }

  for (const rawLine of removeNotes(source).split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue
    const match = /^\\([a-z]+\d*)\b\s*([\s\S]*)$/.exec(line)
    if (!match) {
      processText(line)
      continue
    }
    const [, marker = '', rest = ''] = match

    if (marker === 'id') {
      usfm = rest.split(/\s+/)[0]?.toUpperCase() ?? ''
    } else if (marker === 'c') {
      finishVerse()
      chapter = Number.parseInt(rest, 10)
      pendingParagraph = true
      pendingHeadings = []
      pendingBlock = undefined
    } else if (headingMarkers.has(marker)) {
      finishVerse()
      const heading = cleanInline(rest).trim()
      if (heading) pendingHeadings.push(heading)
      pendingParagraph = true
    } else if (marker === 'd') {
      finishVerse()
      pendingSuperscription = cleanInline(rest).trim()
      pendingParagraph = true
    } else if (marker === 'b') {
      finishVerse()
      pendingParagraph = true
    } else if (proseBlocks.has(marker)) {
      pendingBlock = { poetry: false, indent: 0 }
      processText(rest)
    } else if (poetryLines.test(marker)) {
      pendingBlock = { poetry: true, indent: Number(marker.match(/\d/)?.[0] ?? 1) }
      processText(rest)
    } else if (marker === 'v') {
      processText(`\\v ${rest}`)
    } else if (marker === 'nb') {
      processText(rest)
    } else if (!ignoredMarkers.test(marker)) {
      processText(rest)
    }
  }
  finishVerse()

  // Drop empty verses (e.g. verse numbers kept only for versification).
  for (const [number, verses] of chapters) {
    chapters.set(number, verses.filter((verse) => verse.text.trim().length > 0))
  }
  chapters.delete(0)
  return { usfm, chapters }
}
