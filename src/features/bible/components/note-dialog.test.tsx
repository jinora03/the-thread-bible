import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { NOTE_MAX_LENGTH } from '@shared/schemas/library'
import { NoteDialog } from './note-dialog'

const reference = { book: 'romans', chapter: 8, verse: 28 }

function renderDialog(synced = false) {
  const onSave = vi.fn()
  const onClose = vi.fn()
  render(<NoteDialog reference={reference} synced={synced} onSave={onSave} onClose={onClose} />)
  return { onSave, onClose }
}

describe('NoteDialog', () => {
  it('names the passage and where the note will be kept', () => {
    renderDialog()
    expect(screen.getByRole('dialog', { name: 'Note on Romans 8:28' })).toBeInTheDocument()
    expect(screen.getByText(/Saved in this browser/)).toBeInTheDocument()
  })

  it('says notes sync when signed in', () => {
    renderDialog(true)
    expect(screen.getByText(/Saved to your account/)).toBeInTheDocument()
  })

  it('refuses an empty note and explains why', async () => {
    const { onSave } = renderDialog()
    const field = screen.getByLabelText('Your note')
    await userEvent.type(field, '   ')
    await userEvent.click(screen.getByRole('button', { name: 'Save note' }))

    expect(onSave).not.toHaveBeenCalled()
    expect(field).toHaveAttribute('aria-invalid', 'true')
    expect(field).toHaveAccessibleDescription(/.+ Up to 2000 characters\./)
  })

  it('refuses a note over the limit', async () => {
    const { onSave } = renderDialog()
    const field = screen.getByLabelText('Your note')
    await userEvent.click(field)
    await userEvent.paste('x'.repeat(NOTE_MAX_LENGTH + 1))
    await userEvent.click(screen.getByRole('button', { name: 'Save note' }))
    expect(onSave).not.toHaveBeenCalled()
    expect(field).toHaveAttribute('aria-invalid', 'true')
  })

  it('saves trimmed text and closes', async () => {
    const { onSave, onClose } = renderDialog()
    await userEvent.type(screen.getByLabelText('Your note'), '  All things work together.  ')
    await userEvent.click(screen.getByRole('button', { name: 'Save note' }))
    expect(onSave).toHaveBeenCalledWith(reference, 'All things work together.')
    expect(onClose).toHaveBeenCalled()
  })

  it('closes on Escape without saving', async () => {
    const { onSave, onClose } = renderDialog()
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
    expect(onSave).not.toHaveBeenCalled()
  })
})
