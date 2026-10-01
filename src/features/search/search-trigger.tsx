import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSearchDialog } from '@/features/search/search-provider'

const isMac = typeof navigator !== 'undefined' && /mac|iphone|ipad/i.test(navigator.userAgent)

/** Navigation search button: a wide field-like button on desktop, an icon on small screens. */
export function SearchTrigger() {
  const { setOpen } = useSearchDialog()

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="hidden w-64 justify-start gap-2.5 bg-surface px-3 font-normal text-muted-foreground lg:inline-flex"
        aria-keyshortcuts={isMac ? 'Meta+K' : 'Control+K'}
      >
        <Search />
        <span>Search the library</span>
        <kbd className="ml-auto rounded-sm border px-1.5 py-0.5 font-sans text-[0.6875rem] text-muted-foreground">
          {isMac ? '⌘K' : 'Ctrl K'}
        </kbd>
      </Button>
      <Button variant="ghost" size="icon" onClick={() => setOpen(true)} className="lg:hidden" aria-label="Search">
        <Search />
      </Button>
    </>
  )
}
