import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ChapterGrid } from '@/features/bible/components/chapter-grid'
import type { BibleBook } from '@shared/types/scripture'

interface ChapterSelectorProps {
  book: BibleBook
  currentChapter: number
}

export function ChapterSelector({ book, currentChapter }: ChapterSelectorProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="gap-1.5 px-2.5 font-serif text-base font-normal tabular-nums sm:text-[1.0625rem]"
          aria-label={`Chapter ${currentChapter} of ${book.chapterCount}. Choose a chapter`}
        >
          {currentChapter}
          <ChevronDown aria-hidden="true" className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(20rem,calc(100vw-1.5rem))] p-0">
        <p className="border-b px-3 py-2.5 text-xs text-muted-foreground">
          {book.name} · {book.chapterCount} {book.chapterCount === 1 ? 'chapter' : 'chapters'}
          <span className="ml-2 inline-flex items-center gap-1">
            <span aria-hidden="true" className="size-1 rounded-full bg-thread" /> study notes
          </span>
        </p>
        <div className="max-h-[min(60dvh,22rem)] overflow-y-auto p-2">
          <ChapterGrid book={book} currentChapter={currentChapter} onNavigate={() => setOpen(false)} />
        </div>
      </PopoverContent>
    </Popover>
  )
}
