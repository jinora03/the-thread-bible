import { useQuery } from '@tanstack/react-query'
import { NavLink } from 'react-router'
import { ChapterGrid } from '@/features/bible/components/chapter-grid'
import { cn } from '@/lib/utils'
import { chapterNotesQuery } from '@/services/content'
import { getBook } from '@shared/scripture/books'
import { chapterHref } from '@shared/scripture/reference'
import type { BibleBook } from '@shared/types/scripture'

/** Desktop left column: chapters of the open book, and chapters that have study notes. */
export function ReaderNavigation({ book, chapter }: { book: BibleBook; chapter: number }) {
  const { data: notes = [] } = useQuery(chapterNotesQuery())

  return (
    <nav aria-label="Chapters" className="sticky top-14 h-[calc(100dvh-3.5rem)] space-y-10 overflow-y-auto overscroll-contain px-5 py-8">
      <section aria-labelledby="reader-nav-book">
        <h2 id="reader-nav-book" className="font-serif text-lg">
          {book.name}
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{book.chapterCount} chapters</p>
        <ChapterGrid book={book} currentChapter={chapter} columns={5} className="mt-4" />
      </section>

      {notes.length > 0 && (
        <section aria-labelledby="reader-nav-notes">
          <h2 id="reader-nav-notes" className="eyebrow">
            With study notes
          </h2>
          <ul className="mt-3 space-y-0.5">
            {notes.map((note) => (
              <li key={`${note.bookId}-${note.chapter}`}>
                <NavLink
                  to={chapterHref(note.bookId, note.chapter)}
                  end
                  className={({ isActive }) => cn('-mx-2 block rounded-md px-2 py-1.5 transition-colors hover:bg-accent', isActive && 'bg-accent')}
                >
                  <span className="block text-sm font-medium">
                    {getBook(note.bookId)?.name} {note.chapter}
                  </span>
                  <span className="block text-xs text-muted-foreground">{note.title}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </section>
      )}
    </nav>
  )
}
