import { z } from 'zod'
import { chapterLocationSchema, referenceObjectSchema, studyIdSchema } from './common'

export const NOTE_MAX_LENGTH = 2000

/** Upper bounds for one library, so an import cannot be used to flood an account. */
export const LIBRARY_LIMITS = { bookmarks: 2000, notes: 1000 } as const

export const noteTextSchema = z
  .string()
  .trim()
  .min(1, 'Write something before saving the note.')
  .max(NOTE_MAX_LENGTH, `Notes can be up to ${NOTE_MAX_LENGTH} characters.`)

/** An ISO 8601 UTC timestamp, as produced by `Date.prototype.toISOString`. */
export const timestampSchema = z.iso.datetime({ message: 'Expected an ISO timestamp' })

const itemIdSchema = z.string().min(1).max(100)
const sectionIdSchema = z.string().regex(/^[a-z0-9-]{1,80}$/, 'Expected a section id')

export const bookmarkSchema = z.object({
  id: itemIdSchema,
  reference: referenceObjectSchema,
  createdAt: timestampSchema,
})

/** Notes follow the same rules everywhere: the note form, the API, browser storage and imports. */
export const noteSchema = z.object({
  id: itemIdSchema,
  reference: referenceObjectSchema,
  text: noteTextSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
})

export const lastReadSchema = chapterLocationSchema.and(z.object({ readAt: timestampSchema }))
export const lastStudySchema = z.object({ studyId: studyIdSchema, sectionId: sectionIdSchema, updatedAt: timestampSchema })

export const readingStateSchema = z.object({
  lastRead: lastReadSchema.nullable(),
  lastStudy: lastStudySchema.nullable(),
})

/** The whole library, as stored in the browser and returned by GET /api/library. */
export const libraryDataSchema = z.object({
  bookmarks: z.array(bookmarkSchema).max(LIBRARY_LIMITS.bookmarks, `At most ${LIBRARY_LIMITS.bookmarks} saved passages`),
  notes: z.array(noteSchema).max(LIBRARY_LIMITS.notes, `At most ${LIBRARY_LIMITS.notes} notes`),
  reading: readingStateSchema,
})

// Request bodies
export const createBookmarkBodySchema = z.object({ reference: referenceObjectSchema })
export const createNoteBodySchema = z.object({ reference: referenceObjectSchema, text: noteTextSchema })
export const updateNoteBodySchema = z.object({ text: noteTextSchema })
export const readingUpdateBodySchema = z.object({
  lastRead: chapterLocationSchema.optional(),
  lastStudy: z.object({ studyId: studyIdSchema, sectionId: sectionIdSchema }).optional(),
})
/** Merges a signed-out browser library into an account on sign-in. */
export const importLibraryBodySchema = libraryDataSchema
