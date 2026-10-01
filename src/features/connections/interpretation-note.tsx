import { RichTextInline } from '@/components/content/rich-text'
import type { RichText } from '@shared/types/content'

/**
 * The rare note on interpretation, used only where a disagreement materially
 * changes a passage's meaning. Short, neutral and visually secondary: the
 * page is about the passages, not the debate.
 */
export function InterpretationNote({ text }: { text: RichText }) {
  return (
    <div role="note" aria-label="A note on interpretation" className="border-l-2 border-border pl-4">
      <p className="eyebrow">A note on interpretation</p>
      <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-muted-foreground">
        <RichTextInline text={text} />
      </p>
    </div>
  )
}
