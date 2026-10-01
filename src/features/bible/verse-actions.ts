import { toast } from 'sonner'
import { verseToPlainText } from '@/components/scripture/plain-text'
import { formatReference, referenceHref } from '@shared/scripture/reference'
import type { ScriptureReference, Verse } from '@shared/types/scripture'

async function copyText(text: string, successMessage: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(successMessage)
  } catch {
    toast.error('Copying isn’t available in this browser. Select the text to copy it instead.')
  }
}

/** Passage text for sharing: one verse plainly, several with their numbers. */
export function passageText(verses: Verse[]) {
  if (verses.length === 1) return verseToPlainText(verses[0]!.text)
  return verses.map((verse) => `${verse.number} ${verseToPlainText(verse.text)}`).join(' ')
}

export function copyPassage(reference: ScriptureReference, verses: Verse[], translationAbbreviation: string) {
  const label = formatReference(reference)
  return copyText(`“${passageText(verses)}” (${label}, ${translationAbbreviation})`, `Copied ${label}`)
}

export function copyReference(reference: ScriptureReference) {
  const label = formatReference(reference)
  return copyText(label, `Copied “${label}”`)
}

/** Native share sheet where available; otherwise copy a link. */
export async function sharePassage(reference: ScriptureReference, verses: Verse[]) {
  const label = formatReference(reference)
  const url = new URL(referenceHref(reference), window.location.origin).toString()

  if (navigator.share) {
    try {
      await navigator.share({ title: label, text: `“${passageText(verses)}” (${label})`, url })
    } catch {
      // The reader dismissed the share sheet; nothing to report.
    }
    return
  }
  return copyText(url, `Link to ${label} copied`)
}
