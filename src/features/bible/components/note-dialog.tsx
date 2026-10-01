import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'
import { saveErrorMessage } from '@/features/library/library-errors'
import { NOTE_MAX_LENGTH, noteTextSchema } from '@shared/schemas/library'
import { formatReference } from '@shared/scripture/reference'
import type { ScriptureReference } from '@shared/types/scripture'

// The same rule the API enforces, so the form never accepts what the server rejects.
const noteFormSchema = z.object({ text: noteTextSchema })

type NoteFormValues = z.infer<typeof noteFormSchema>

interface NoteDialogProps {
  /** The passage being annotated; `null` closes the dialog. */
  reference: ScriptureReference | null
  /** Whether notes go to the reader's account (true) or this browser (false). */
  synced: boolean
  /** Resolves once the note is stored; rejects if it could not be. */
  onSave: (reference: ScriptureReference, text: string) => Promise<void>
  onClose: () => void
  /** Lets the caller return focus to whatever opened the dialog. */
  onCloseAutoFocus?: (event: Event) => void
}

export function NoteDialog({ reference, synced, onSave, onClose, onCloseAutoFocus }: NoteDialogProps) {
  // While a save is in flight the dialog stays open, so a failure can never lose the draft.
  const [saving, setSaving] = useState(false)
  return (
    <Dialog open={reference !== null} onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent onCloseAutoFocus={onCloseAutoFocus}>
        {reference && (
          <NoteForm
            key={formatReference(reference)}
            reference={reference}
            synced={synced}
            onSave={onSave}
            onSavingChange={setSaving}
            onDone={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function NoteForm({
  reference,
  synced,
  onSave,
  onSavingChange,
  onDone,
}: {
  reference: ScriptureReference
  synced: boolean
  onSave: NoteDialogProps['onSave']
  onSavingChange: (saving: boolean) => void
  onDone: () => void
}) {
  const label = formatReference(reference)
  const form = useForm<NoteFormValues>({
    resolver: zodResolver(noteFormSchema),
    defaultValues: { text: '' },
  })
  const error = form.formState.errors.text
  const saving = form.formState.isSubmitting
  const [saveError, setSaveError] = useState<string | null>(null)

  // Success is reported only once the note is stored; on failure the draft stays for another try.
  const onSubmit = async (values: NoteFormValues) => {
    setSaveError(null)
    onSavingChange(true)
    try {
      await onSave(reference, values.text)
    } catch (failure) {
      setSaveError(saveErrorMessage(failure))
      return
    } finally {
      onSavingChange(false)
    }
    toast.success(`Note on ${label} saved to your Library`)
    onDone()
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="grid gap-5">
      <DialogHeader>
        <DialogTitle>Note on {label}</DialogTitle>
        <DialogDescription>
          {synced
            ? 'Saved to your account and listed in your Library.'
            : 'Saved in this browser and listed in your Library. Sign in to keep notes across devices.'}
        </DialogDescription>
      </DialogHeader>

      <Field data-invalid={Boolean(error)}>
        <FieldLabel htmlFor="note-text">Your note</FieldLabel>
        <Textarea
          id="note-text"
          rows={5}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'note-text-error note-text-hint' : 'note-text-hint'}
          {...form.register('text')}
        />
        <FieldDescription id="note-text-hint">Up to {NOTE_MAX_LENGTH} characters.</FieldDescription>
        <FieldError id="note-text-error" errors={[error]} />
      </Field>

      {saveError && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          {saveError} Your note is still here.
        </p>
      )}

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="ghost" disabled={saving}>
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : saveError ? 'Try again' : 'Save note'}
        </Button>
      </DialogFooter>
    </form>
  )
}
