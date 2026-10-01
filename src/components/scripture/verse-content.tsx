import { Fragment } from 'react'

// KJV and BSB print the divine name (YHWH) as LORD / GOD in small capitals.
// The data keeps the uppercase form; here it is rendered as true small caps
// so screen readers say "Lord" rather than spelling out L-O-R-D.
const divineName = /\b(LORD|GOD)\b/g

function DivineNames({ text }: { text: string }) {
  const parts = text.split(divineName)
  if (parts.length === 1) return text
  return parts.map((part, index) =>
    part === 'LORD' || part === 'GOD' ? (
      <span key={index} className="divine-name">
        {part.charAt(0) + part.slice(1).toLowerCase()}
      </span>
    ) : (
      part
    ),
  )
}

/**
 * Verse text. Poetry arrives with `\n` between lines and `\t` before indented
 * lines; both become real line breaks and indentation.
 */
export function VerseContent({ text }: { text: string }) {
  if (!text.includes('\n') && !text.startsWith('\t')) return <DivineNames text={text} />

  return text.split('\n').map((line, index) => {
    const indented = line.startsWith('\t')
    const content = <DivineNames text={indented ? line.slice(1) : line} />
    return (
      <Fragment key={index}>
        {index > 0 && <br />}
        {indented ? <span className="ml-[1.5em]">{content}</span> : content}
      </Fragment>
    )
  })
}

