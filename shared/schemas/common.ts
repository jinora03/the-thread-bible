import { z } from 'zod'
import { parseReference } from '../scripture/reference'
import type { ConnectionEndpoint } from '../types/connections'
import type { EntityId } from '../types/content'
import type { ScriptureReference } from '../types/scripture'

export const entityKinds = [
  'doctrine',
  'prophecy',
  'theme',
  'typology',
  'person',
  'place',
  'event',
  'covenant',
  'promise',
  'symbol',
  'genealogy',
  'study',
] as const

const entityIdPattern = new RegExp(`^(${entityKinds.join('|')}):[a-z0-9-]+$`)

export const entityIdSchema = z
  .string()
  .regex(entityIdPattern, 'Expected an entity id such as "theme:covenant"')
  .transform((value) => value as EntityId)

/** A structured reference object (API bodies, stored data). */
export const referenceObjectSchema = z.object({
  book: z.string().min(1),
  chapter: z.number().int().positive(),
  verse: z.number().int().positive().optional(),
  endChapter: z.number().int().positive().optional(),
  endVerse: z.number().int().positive().optional(),
}) satisfies z.ZodType<ScriptureReference>

/** A human-written reference in content files: "Isaiah 52:13–53:12". */
export const referenceStringSchema = z.string().transform((value, ctx): ScriptureReference => {
  const reference = parseReference(value)
  if (!reference) {
    ctx.addIssue({ code: 'custom', message: `"${value}" is not a valid Scripture reference` })
    return z.NEVER
  }
  return reference
})

/** A connection endpoint: an entity id ("doctrine:resurrection") or a reference ("John 1:29"). */
export const endpointStringSchema = z.string().transform((value, ctx): ConnectionEndpoint => {
  if (entityIdPattern.test(value)) return { type: 'entity', id: value as EntityId }
  const reference = parseReference(value)
  if (!reference) {
    ctx.addIssue({ code: 'custom', message: `"${value}" is neither an entity id nor a Scripture reference` })
    return z.NEVER
  }
  return { type: 'scripture', reference }
})

export const reviewSchema = z
  .object({
    status: z.enum(['draft', 'in-review', 'published']),
    authors: z.array(z.string().min(1)).min(1, 'List at least one author'),
    reviewers: z
      .array(
        z.object({
          name: z.string().min(1),
          role: z.enum(['theological', 'editorial', 'historical']),
          date: z.iso.date(),
        }),
      )
      .default([]),
    note: z.string().optional(),
  })
  .refine((review) => review.status !== 'published' || review.reviewers.length > 0, {
    message: 'Published content must record at least one completed review',
    path: ['reviewers'],
  })
