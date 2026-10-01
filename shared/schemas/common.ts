import { z } from 'zod'
import { parseReference, referenceProblem } from '../scripture/reference'
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

/**
 * A structured reference object (API bodies, stored data). Held to the same
 * rules as written references: a canonical book, a chapter within it, verses
 * from 1, and a well-formed range.
 */
export const referenceObjectSchema = z
  .object({
    book: z.string().min(1),
    chapter: z.number().int().positive(),
    verse: z.number().int().positive().optional(),
    endChapter: z.number().int().positive().optional(),
    endVerse: z.number().int().positive().optional(),
  })
  .superRefine((reference, ctx) => {
    const problem = referenceProblem(reference)
    if (problem) ctx.addIssue({ code: 'custom', message: problem })
  }) satisfies z.ZodType<ScriptureReference>

/** A chapter that exists: reading progress, chapter links. */
export const chapterLocationSchema = z
  .object({ bookId: z.string().min(1), chapter: z.number().int().positive() })
  .superRefine(({ bookId, chapter }, ctx) => {
    const problem = referenceProblem({ book: bookId, chapter })
    if (problem) ctx.addIssue({ code: 'custom', message: problem })
  })

/** A study id ("study:from-promise-to-fulfillment"). */
export const studyIdSchema = z
  .string()
  .regex(/^study:[a-z0-9-]+$/, 'Expected a study id such as "study:the-lamb-of-god"')
  .transform((value) => value as EntityId<'study'>)

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
