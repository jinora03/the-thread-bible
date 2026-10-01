import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { LibrarySaveError } from '@/features/library/library-errors'
import { NOTE_MAX_LENGTH } from '@shared/schemas/library'
import { NoteDialog } from './note-dialog'

const reference = { book: 'romans', chapter: 8, verse: 28 }

function renderDialog(synced = false, onSave = vi.fn(async () => {})) {
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
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('keeps the draft and offers a retry when saving fails', async () => {
    const onSave = vi.fn().mockRejectedValueOnce(new LibrarySaveError('account')).mockResolvedValueOnce(undefined)
    const { onClose } = renderDialog(true, onSave)
    await userEvent.type(screen.getByLabelText('Your note'), 'Do not lose this')
    await userEvent.click(screen.getByRole('button', { name: 'Save note' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn’t be saved to your account.*Your note is still here/)
    expect(screen.getByLabelText('Your note')).toHaveValue('Do not lose this')
    expect(onClose).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(onSave).toHaveBeenCalledTimes(2)
  })

  it('saves once, however often Save is pressed, and cannot be closed mid-save', async () => {
    let finish!: () => void
    const onSave = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)))
    const { onClose } = renderDialog(false, onSave)
    await userEvent.type(screen.getByLabelText('Your note'), 'Once')
    const save = screen.getByRole('button', { name: 'Save note' })
    await userEvent.click(save)
    await userEvent.click(save)

    expect(await screen.findByRole('button', { name: 'Saving…' })).toBeDisabled()
    await userEvent.keyboard('{Escape}')
    expect(onClose).not.toHaveBeenCalled()

    finish()
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it('closes on Escape without saving', async () => {
    const { onSave, onClose } = renderDialog()
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
    expect(onSave).not.toHaveBeenCalled()
  })
})
