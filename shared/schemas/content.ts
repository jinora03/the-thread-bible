import { z } from 'zod'
import {
  endpointStringSchema,
  entityIdSchema,
  referenceStringSchema,
  reviewSchema,
} from './common'

// Schemas for the editorial files in /content. Each file is validated on
// load (and in CI via `npm run content:check`); a bad reference or a
// missing field fails loudly with the file path.

const richText = z.string().trim().min(1)
const paragraphs = z.array(richText).min(1)

// Competing readings are not a standard section. When a disagreement materially
// changes a passage's meaning, one short note says so (content/GUIDELINES.md).
const interpretationNote = richText.optional()

/** Fields shared by every entity file. `kind` and `slug` come from the file's location. */
export const entityFieldsSchema = z.object({
  title: z.string().min(1),
  summary: richText,
  keyReferences: z.array(referenceStringSchema).default([]),
  relatedIds: z.array(entityIdSchema).default([]),
  tags: z.array(z.string().min(1)).default([]),
  /** A chain-reference thread (threads/<id>.yaml) to trace from this entry. */
  threadId: z.string().optional(),
  review: reviewSchema,
})

export const doctrineFileSchema = entityFieldsSchema.extend({
  category: z.string().min(1),
  article: z
    .object({
      keyScriptures: z.array(referenceStringSchema).min(1),
      /** What Scripture teaches, summarized briefly: it points to the passages rather than replacing them. */
      teaching: paragraphs,
      foundation: z.object({ oldTestament: paragraphs, newTestament: paragraphs }),
      insights: z.array(z.object({ title: z.string().min(1), body: richText })).min(1),
      questions: z.array(z.object({ question: z.string().min(1), answer: paragraphs })).default([]),
      interpretationNote,
      furtherStudyIds: z.array(entityIdSchema).default([]),
    })
    .optional(),
})

export const prophecyFileSchema = entityFieldsSchema.extend({
  passage: referenceStringSchema,
  classification: z.array(z.string().min(1)).default([]),
  detail: z
    .object({
      historicalContext: paragraphs,
      /** Important wording in the passage, each with a short note. */
      keyWording: z.array(z.object({ label: z.string().min(1), reference: referenceStringSchema, note: richText })).default([]),
      /** Related Old Testament passages that share its language or hope. */
      oldTestament: z.array(referenceStringSchema).default([]),
      /** How the New Testament writers use the passage. */
      connectionsIntroduction: richText,
      themeIds: z.array(entityIdSchema).default([]),
      interpretationNote,
      relatedStudyIds: z.array(entityIdSchema).default([]),
    })
    .optional(),
})

export const studyFileSchema = entityFieldsSchema.extend({
  readingMinutes: z.number().int().positive(),
  author: z.string().min(1),
  intro: paragraphs.optional(),
  sections: z
    .array(
      z.object({
        id: z.string().regex(/^[a-z0-9-]+$/, 'Section ids are used in URLs: lowercase letters, digits and hyphens'),
        title: z.string().min(1),
        passage: referenceStringSchema.optional(),
        body: paragraphs,
      }),
    )
    .optional(),
})

export const personFileSchema = entityFieldsSchema.extend({ role: z.string().min(1) })
export const placeFileSchema = entityFieldsSchema.extend({ region: z.string().optional() })

/** Themes, typology, events, covenants, promises, symbols, genealogies. */
export const basicEntityFileSchema = entityFieldsSchema

export const connectionsFileSchema = z.object({
  review: reviewSchema,
  connections: z
    .array(
      z.object({
        id: z.string().regex(/^[a-z0-9-]+$/),
        type: z.enum([
          'prophecy-fulfillment',
          'type-antitype',
          'cross-reference',
          'supports-doctrine',
          'contrasts',
          'parallel',
          'quotation',
          'allusion',
          'genealogy',
          'timeline',
          'covenant',
          'promise-fulfillment',
        ]),
        source: endpointStringSchema,
        target: endpointStringSchema,
        basis: z.enum(['stated', 'supported', 'suggested']),
        description: z.string().optional(),
        scriptureReferences: z.array(referenceStringSchema).optional(),
      }),
    )
    .min(1),
})

export const chapterNotesFileSchema = z.object({
  book: z.string().min(1),
  chapter: z.number().int().positive(),
  title: z.string().min(1),
  review: reviewSchema,
  overview: richText,
  /** Passages that illuminate the chapter as a whole. */
  relatedScripture: z.array(referenceStringSchema).default([]),
  relatedIds: z.array(entityIdSchema).default([]),
  crossReferences: z
    .array(z.object({ verse: z.number().int().positive(), references: z.array(referenceStringSchema).min(1) }))
    .default([]),
})

export const threadFileSchema = z.object({
  title: z.string().min(1),
  review: reviewSchema,
  steps: z
    .array(z.object({ reference: referenceStringSchema, title: z.string().min(1), label: z.string().min(1) }))
    .min(2),
})

export const homeFileSchema = z.object({
  todaysScripture: referenceStringSchema,
  featuredStudyId: entityIdSchema,
  featuredThreadId: z.string(),
  themeIds: z.array(entityIdSchema).min(1),
  searchSuggestions: z.array(z.string().min(1)).default([]),
})
