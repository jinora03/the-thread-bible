import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Verse } from '@shared/types/scripture'
import { ScriptureText } from './scripture-text'

const psalm: Verse[] = [
  { number: 1, text: 'The LORD is my shepherd;\n\tI shall not want.', heading: 'The LORD Is My Shepherd', superscription: 'A Psalm of David.', paragraph: true, poetry: true },
  { number: 2, text: 'He makes me lie down in green pastures;', poetry: true },
  { number: 4, text: 'Even though I walk through the valley…', paragraph: true, poetry: true },
]

describe('ScriptureText', () => {
  it('renders verse numbers and text in reading order', () => {
    const { container } = render(<ScriptureText verses={psalm} />)
    expect(container).toHaveTextContent(/^\s*A Psalm of David\.\s*1\s*The Lord is my shepherd;/)
  })

  it('sets the divine name in small caps without spelling it out', () => {
    const { container } = render(<ScriptureText verses={psalm} />)
    const names = container.querySelectorAll('.divine-name')
    expect(names).toHaveLength(1)
    expect(names[0]).toHaveTextContent(/^Lord$/)
  })

  it('breaks poetic lines and indents continuation lines', () => {
    const { container } = render(<ScriptureText verses={psalm} idPrefix="v" />)
    const first = container.querySelector('#v1')!
    expect(first.querySelectorAll('br')).toHaveLength(1)
    expect(first.querySelector('.ml-\\[1\\.5em\\]')).toHaveTextContent('I shall not want.')
    // A poetic verse that does not start a paragraph still starts a new line.
    expect(container.querySelector('#v2 > br')).not.toBeNull()
  })

  it('shows headings only when asked, as real headings', () => {
    const { rerender } = render(<ScriptureText verses={psalm} />)
    expect(screen.queryByRole('heading')).toBeNull()
    rerender(<ScriptureText verses={psalm} showHeadings headingLevel={3} />)
    expect(screen.getByRole('heading', { level: 3, name: 'The LORD Is My Shepherd' })).toBeInTheDocument()
  })

  it('explains verses the translation omits', () => {
    render(<ScriptureText verses={psalm} />)
    expect(screen.getByText('Verse 3 is not included in this translation.')).toBeInTheDocument()
  })

  it('highlights the selected range', () => {
    const { container } = render(<ScriptureText verses={psalm} idPrefix="v" highlight={{ start: 2, end: 4 }} />)
    expect(container.querySelector('#v1')).not.toHaveClass('bg-highlight')
    expect(container.querySelector('#v2')).toHaveClass('bg-highlight')
    expect(container.querySelector('#v4')).toHaveClass('bg-highlight')
  })

  it('renders study mode as a numbered list', () => {
    render(<ScriptureText verses={psalm} mode="study" renderVerseAnnotations={(verse) => <span>note {verse.number}</span>} />)
    const items = screen.getAllByRole('listitem')
    expect(items.map((item) => item.getAttribute('value'))).toEqual(['1', '2', '4'])
    expect(items[0]).toHaveTextContent('note 1')
  })
})
