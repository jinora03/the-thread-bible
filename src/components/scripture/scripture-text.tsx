import { Heading, type HeadingLevel } from '@/components/typography/heading'
import { VerseContent } from '@/components/scripture/verse-content'
import { VerseNumber } from '@/components/scripture/verse-number'
import { cn } from '@/lib/utils'
import type { ReadingMode, Verse } from '@shared/types/scripture'

interface ScriptureTextProps {
  verses: Verse[]
  mode?: ReadingMode
  /** Verses to highlight: the selected range. */
  highlight?: { start: number; end: number }
  /** Replace the default verse numeral; the reader injects its action menu here. */
  renderVerseMarker?: (verse: Verse) => React.ReactNode
  /** Study mode only: annotations under each verse (cross-references, connections). */
  renderVerseAnnotations?: (verse: Verse) => React.ReactNode
  /** Prefix for verse element ids; omit to render no ids (e.g. in previews). */
  idPrefix?: string
  /** Show the translation's section headings (the reader does; quotations don't). */
  showHeadings?: boolean
  headingLevel?: HeadingLevel
  className?: string
}

type Block =
  | { type: 'heading'; text: string; key: string }
  | { type: 'superscription'; text: string; key: string }
  | { type: 'paragraph'; verses: Verse[]; poetry: boolean }
  | { type: 'gap'; from: number; to: number }

/** Groups verses into paragraphs, with headings, psalm titles and gaps between them. */
function toBlocks(verses: Verse[], showHeadings: boolean): Block[] {
  const blocks: Block[] = []
  let previous: Verse | undefined

  for (const verse of verses) {
    const skipped = previous !== undefined && verse.number > previous.number + 1
    if (skipped) blocks.push({ type: 'gap', from: previous!.number + 1, to: verse.number - 1 })
    if (showHeadings && verse.heading) blocks.push({ type: 'heading', text: verse.heading, key: `h-${verse.number}` })
    if (verse.superscription) blocks.push({ type: 'superscription', text: verse.superscription, key: `s-${verse.number}` })

    const current = blocks.at(-1)
    if (current?.type === 'paragraph' && !verse.paragraph) {
      current.verses.push(verse)
      current.poetry ||= Boolean(verse.poetry)
    } else {
      blocks.push({ type: 'paragraph', verses: [verse], poetry: Boolean(verse.poetry) })
    }
    previous = verse
  }
  return blocks
}

function isHighlighted(verse: Verse, highlight?: { start: number; end: number }) {
  return highlight !== undefined && verse.number >= highlight.start && verse.number <= highlight.end
}

/**
 * Binds the numeral to the verse's first word so a line never ends on a bare
 * number (the numeral may be a button, which would otherwise allow a break).
 */
function VerseStart({ marker, text }: { marker: React.ReactNode; text: string }) {
  const indented = text.startsWith('\t')
  const body = indented ? text.slice(1) : text
  const split = body.search(/[ \n]/)
  const firstWord = split === -1 ? body : body.slice(0, split)
  const rest = split === -1 ? '' : body.slice(split)
  return (
    <>
      <span className={cn('whitespace-nowrap', indented && 'ml-[1.5em]')}>
        {marker}
        <VerseContent text={firstWord} />
      </span>
      <VerseContent text={rest} />
    </>
  )
}

/** Some translations omit verses found in others (e.g. Matthew 17:21 in the BSB). */
function GapNote({ from, to }: { from: number; to: number }) {
  const range = from === to ? `Verse ${from} is` : `Verses ${from}–${to} are`
  return <p className="font-sans text-sm text-muted-foreground italic">{range} not included in this translation.</p>
}

export function ScriptureText({
  verses,
  mode = 'reading',
  highlight,
  renderVerseMarker,
  renderVerseAnnotations,
  idPrefix,
  showHeadings = false,
  headingLevel = 2,
  className,
}: ScriptureTextProps) {
  const marker = (verse: Verse) => (renderVerseMarker ? renderVerseMarker(verse) : <VerseNumber number={verse.number} />)
  const verseId = (verse: Verse) => (idPrefix ? `${idPrefix}${verse.number}` : undefined)

  if (mode === 'study') {
    return (
      <ol className={cn('scripture-text list-none space-y-5', className)}>
        {verses.map((verse) => (
          <li key={verse.number} id={verseId(verse)} value={verse.number} className="scroll-mt-32">
            {showHeadings && verse.heading && <TranslationHeading text={verse.heading} level={headingLevel} className="mb-4 ml-[2.5rem]" />}
            {verse.superscription && <Superscription text={verse.superscription} className="mb-2 ml-[2.5rem]" />}
            <div className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-1">
              <span className="pt-[0.35em] text-right [&_sup]:align-baseline [&_sup]:text-[0.72em]">{marker(verse)}</span>
              <div className={cn('rounded-sm px-1.5 transition-colors', isHighlighted(verse, highlight) && 'bg-highlight')}>
                <VerseContent text={verse.text} />
                {renderVerseAnnotations?.(verse)}
              </div>
            </div>
          </li>
        ))}
      </ol>
    )
  }

  return (
    <div className={cn('scripture-text space-y-[0.9em]', className)}>
      {toBlocks(verses, showHeadings).map((block) => {
        switch (block.type) {
          case 'gap':
            return <GapNote key={`gap-${block.from}`} from={block.from} to={block.to} />
          case 'heading':
            return <TranslationHeading key={block.key} text={block.text} level={headingLevel} className="pt-[0.6em]" />
          case 'superscription':
            return <Superscription key={block.key} text={block.text} />
          case 'paragraph':
            return (
              <p key={block.verses[0]!.number} className={cn(block.poetry && 'pl-[0.25em]')}>
                {block.verses.map((verse, index) => (
                  <span
                    key={verse.number}
                    id={verseId(verse)}
                    className={cn(
                      'scroll-mt-32 rounded-sm box-decoration-clone transition-colors',
                      isHighlighted(verse, highlight) && 'bg-highlight',
                    )}
                  >
                    {/* Each verse of poetry starts on its own line. */}
                    {verse.poetry && index > 0 && <br />}
                    <VerseStart marker={marker(verse)} text={verse.text} />{' '}
                  </span>
                ))}
              </p>
            )
        }
      })}
    </div>
  )
}

/** Section headings are the translators' editorial aids, so they are set in sans, not Scripture serif. */
function TranslationHeading({ text, level, className }: { text: string; level: HeadingLevel; className?: string }) {
  return (
    <Heading level={level} variant="label" className={cn('font-semibold tracking-[0.08em] text-foreground/75', className)}>
      {text}
    </Heading>
  )
}

/** Psalm titles belong to the text itself: Scripture serif, set small and italic. */
function Superscription({ text, className }: { text: string; className?: string }) {
  return <p className={cn('text-[0.85em] text-muted-foreground italic', className)}>{text}</p>
}
