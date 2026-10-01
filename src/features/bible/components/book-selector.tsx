import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { bookGroups, testamentLabels } from '@shared/scripture/books'
import { ChapterGrid } from '@/features/bible/components/chapter-grid'
import { getBook } from '@shared/scripture/books'
import { chapterHref } from '@shared/scripture/reference'
import { cn } from '@/lib/utils'
import type { BibleBook } from '@shared/types/scripture'

const compact = (value: string) => value.toLowerCase().replace(/[\s.]/g, '')

/**
 * Predictable book matching (cmdk's fuzzy default ranks "1co" as 1 Chronicles):
 * exact abbreviation, then name prefix, then abbreviation prefix, then substring.
 */
function filterBooks(_value: string, search: string, keywords: string[] = []) {
  const query = compact(search)
  if (!query) return 1
  const [name = '', ...abbreviations] = keywords.map(compact)
  if (abbreviations.includes(query) || name === query) return 1
  if (name.startsWith(query)) return 0.9
  if (abbreviations.some((abbreviation) => abbreviation.startsWith(query))) return 0.8
  return name.includes(query) ? 0.5 : 0
}

interface BookSelectorProps {
  currentBook: BibleBook
  currentChapter: number
  className?: string
}

/**
 * Searchable, grouped book list. Choosing a book moves to its chapter grid in
 * the same popover (single-chapter books open directly).
 */
export function BookSelector({ currentBook, currentChapter, className }: BookSelectorProps) {
  const [open, setOpen] = useState(false)
  const [pendingBook, setPendingBook] = useState<BibleBook | null>(null)
  const navigate = useNavigate()
  const contentRef = useRef<HTMLDivElement>(null)

  // Switching steps unmounts the focused element; move focus into the new step.
  useEffect(() => {
    if (!open) return
    const root = contentRef.current
    const target = pendingBook ? root?.querySelector<HTMLElement>('a[tabindex="0"]') : root?.querySelector('input')
    target?.focus()
  }, [open, pendingBook])

  const onOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) setPendingBook(null)
  }

  const chooseBook = (book: BibleBook) => {
    if (book.chapterCount === 1) {
      onOpenChange(false)
      navigate(chapterHref(book.id, 1))
    } else {
      setPendingBook(book)
    }
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className={cn('min-w-0 gap-1.5 px-2.5 font-serif text-base font-normal sm:text-[1.0625rem]', className)}
          aria-label={`Book: ${currentBook.name}. Choose a book`}
        >
          <span className="truncate">{currentBook.name}</span>
          <ChevronDown aria-hidden="true" className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent ref={contentRef} align="start" className="w-[min(22rem,calc(100vw-1.5rem))] p-0">
        {pendingBook ? (
          <div>
            <div className="flex items-center gap-1 border-b px-1.5 py-1.5">
              <Button variant="ghost" size="icon-sm" onClick={() => setPendingBook(null)} aria-label="Back to books">
                <ChevronLeft />
              </Button>
              <p className="font-serif text-[1.0625rem]">{pendingBook.name}</p>
              <p className="ml-auto pr-2 text-xs text-muted-foreground">{pendingBook.chapterCount} chapters</p>
            </div>
            <div className="max-h-[min(60dvh,22rem)] overflow-y-auto p-2">
              <ChapterGrid
                book={pendingBook}
                currentChapter={pendingBook.id === currentBook.id ? currentChapter : undefined}
                onNavigate={() => onOpenChange(false)}
              />
            </div>
          </div>
        ) : (
          <Command loop label="Books of the Bible" filter={filterBooks}>
            <CommandInput placeholder="Find a book…" aria-label="Find a book" />
            <CommandList className="max-h-[min(60dvh,24rem)]">
              {bookGroups.map((group, index) => {
                const startsTestament = bookGroups[index - 1]?.testament !== group.testament
                return (
                  <CommandGroup
                    key={group.group}
                    heading={
                      startsTestament ? (
                        <>
                          <span className="mb-2 block font-serif text-sm tracking-normal text-foreground normal-case">
                            {testamentLabels[group.testament]}
                          </span>
                          {group.label}
                        </>
                      ) : (
                        group.label
                      )
                    }
                  >
                    {group.bookIds.map((bookId) => {
                      const book = getBook(bookId)
                      if (!book) return null
                      const isCurrent = book.id === currentBook.id
                      return (
                        <CommandItem
                          key={book.id}
                          value={book.id}
                          keywords={[book.name, ...book.abbreviations]}
                          onSelect={() => chooseBook(book)}
                          data-checked={isCurrent}
                        >
                          <span className={cn(isCurrent && 'font-medium')}>{book.name}</span>
                          {isCurrent && <span className="sr-only">(current book)</span>}
                          <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                            {book.chapterCount}
                          </span>
                          {isCurrent && <Check aria-hidden="true" className="text-primary dark:text-reference" />}
                        </CommandItem>
                      )
                    })}
                  </CommandGroup>
                )
              })}
            </CommandList>
          </Command>
        )}
      </PopoverContent>
    </Popover>
  )
}
