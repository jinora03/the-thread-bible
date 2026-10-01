import { cn } from '@/lib/utils'

/** Shared look for verse numerals: quiet, small, never selected with the text. */
export const verseNumberClassName =
  'font-sans text-[0.62em] font-medium leading-none tabular-nums text-verse-number select-none'

export function VerseNumber({ number, label, className }: { number: number; label?: string; className?: string }) {
  return <sup className={cn(verseNumberClassName, 'mr-[0.2em]', className)}>{label ?? number}</sup>
}
