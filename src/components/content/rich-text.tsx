import { EntityLink } from '@/components/content/entity-link'
import { ScriptureReference } from '@/components/scripture/scripture-reference'
import { parseRichText } from '@shared/rich-text'
import { referenceKey } from '@shared/scripture/reference'
import type { RichText as RichTextValue } from '@shared/types/content'

/** Inline content of one editorial paragraph: text, reference previews and entity links. */
export function RichTextInline({ text }: { text: RichTextValue }) {
  return parseRichText(text).map((node, index) => {
    switch (node.type) {
      case 'text':
        return node.text
      case 'reference':
        return (
          <ScriptureReference key={`${index}-${referenceKey(node.reference)}`} reference={node.reference} mode="preview">
            {node.label}
          </ScriptureReference>
        )
      case 'entity':
        return (
          <EntityLink key={`${index}-${node.id}`} id={node.id} className="text-reference link-quiet">
            {node.label}
          </EntityLink>
        )
    }
  })
}

/** Commentary paragraphs. Sans-serif by design: serif body text is reserved for Scripture. */
export function RichText({ paragraphs, className }: { paragraphs: RichTextValue[]; className?: string }) {
  return (
    <div className={className ?? 'prose-commentary'}>
      {paragraphs.map((paragraph, index) => (
        <p key={index}>
          <RichTextInline text={paragraph} />
        </p>
      ))}
    </div>
  )
}
