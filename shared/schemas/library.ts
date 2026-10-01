import { z } from 'zod'
import { entityIdSchema, referenceObjectSchema } from './common'

export const NOTE_MAX_LENGTH = 2000

export const noteTextSchema = z
  .string()
  .trim()
  .min(1, 'Write something before saving the note.')
  .max(NOTE_MAX_LENGTH, `Notes can be up to ${NOTE_MAX_LENGTH} characters.`)

export const bookmarkSchema = z.object({
  id: z.string(),
  reference: referenceObjectSchema,
  createdAt: z.string(),
})

export const noteSchema = z.object({
  id: z.string(),
  reference: referenceObjectSchema,
  text: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const readingStateSchema = z.object({
  lastRead: z
    .object({ bookId: z.string(), chapter: z.number().int().positive(), readAt: z.string() })
    .nullable(),
  lastStudy: z
    .object({
      studyId: entityIdSchema.transform((id) => id as `study:${string}`),
      sectionId: z.string(),
      updatedAt: z.string(),
    })
    .nullable(),
})

/** The whole library, as stored in the browser and returned by GET /api/library. */
export const libraryDataSchema = z.object({
  bookmarks: z.array(bookmarkSchema),
  notes: z.array(noteSchema),
  reading: readingStateSchema,
})

// Request bodies
export const createBookmarkBodySchema = z.object({ reference: referenceObjectSchema })
export const createNoteBodySchema = z.object({ reference: referenceObjectSchema, text: noteTextSchema })
export const updateNoteBodySchema = z.object({ text: noteTextSchema })
export const readingUpdateBodySchema = z.object({
  lastRead: z.object({ bookId: z.string().min(1), chapter: z.number().int().positive() }).optional(),
  lastStudy: z.object({ studyId: entityIdSchema, sectionId: z.string().min(1) }).optional(),
})
/** Merges a signed-out browser library into an account on first sign-in. */
export const importLibraryBodySchema = libraryDataSchema
