import { parseReference } from './scripture/reference'
import type { EntityId, RichText } from './types/content'
import type { ScriptureReference } from './types/scripture'

export type RichTextNode =
  | { type: 'text'; text: string }
  | { type: 'reference'; reference: ScriptureReference; label?: string }
  | { type: 'entity'; id: EntityId; label?: string }

// [[target]] or [[target|label]]
const tokenPattern = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g
const entityIdPattern =
  /^(doctrine|prophecy|theme|typology|person|place|event|covenant|promise|symbol|genealogy|study):[a-z0-9-]+$/

/** Splits editorial prose into text, Scripture references and entity links. */
export function parseRichText(text: RichText): RichTextNode[] {
  const nodes: RichTextNode[] = []
  let cursor = 0

  for (const match of text.matchAll(tokenPattern)) {
    const [token, rawTarget = '', label] = match
    if (match.index > cursor) nodes.push({ type: 'text', text: text.slice(cursor, match.index) })
    cursor = match.index + token.length

    const target = rawTarget.trim()
    if (entityIdPattern.test(target)) {
      nodes.push({ type: 'entity', id: target as EntityId, label })
      continue
    }

    const reference = parseReference(target)
    if (reference) {
      nodes.push({ type: 'reference', reference, label })
    } else {
      // Content validation rejects unknown tokens before they are served; degrade to text.
      nodes.push({ type: 'text', text: label ?? target })
    }
  }

  if (cursor < text.length) nodes.push({ type: 'text', text: text.slice(cursor) })
  return nodes
}

/**
 * Plain text for indexing and previews: tokens become their label, or the
 * reference/entity id they point to.
 */
export function richTextToPlain(text: RichText): string {
  return text.replace(tokenPattern, (_token, target: string, label?: string) => label ?? target.trim())
}
