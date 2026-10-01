import type { EntityId } from './content'
import type { BookId, ScriptureReference } from './scripture'

export interface Bookmark {
  id: string
  reference: ScriptureReference
  createdAt: string
}

export interface Note {
  id: string
  reference: ScriptureReference
  text: string
  createdAt: string
  updatedAt: string
}

export interface ReadingState {
  lastRead: { bookId: BookId; chapter: number; readAt: string } | null
  lastStudy: { studyId: EntityId<'study'>; sectionId: string; updatedAt: string } | null
}

export interface LibraryData {
  bookmarks: Bookmark[]
  notes: Note[]
  reading: ReadingState
}
