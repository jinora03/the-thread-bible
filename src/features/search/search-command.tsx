import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, BookOpen, CornerDownLeft } from 'lucide-react'
import { useNavigate } from 'react-router'
import {
  Command,
  CommandDialog,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { hitHref, hitMeta, hitTitle } from '@/features/search/hit-format'
import { Highlighted, HitSnippet } from '@/features/search/search-hits'
import { useSearchDialog } from '@/features/search/search-provider'
import { useSearch } from '@/features/search/use-search'
import { cn } from '@/lib/utils'
import { homeQuery } from '@/services/content'
import { goToHits } from '@shared/scripture/go-to'
import type { SearchGroup } from '@shared/types/search'

const placeholder = 'Search Scripture, doctrine, prophecy, people, themes…'

/** Command-palette search. Results are grouped by type and come from the search service. */
export function SearchCommand() {
  const { open, setOpen } = useSearchDialog()
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  // Skip focus-return to the trigger when a result navigated to a new page.
  const navigated = useRef(false)

  const onOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) setQuery('')
  }

  const go = (href: string) => {
    navigated.current = true
    onOpenChange(false)
    navigate(href)
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search"
      description="Search Scripture and the study library. Use the arrow keys to move through results and Enter to open one."
      onCloseAutoFocus={(event) => {
        if (navigated.current) event.preventDefault()
        navigated.current = false
      }}
    >
      <SearchPalette query={query} onQueryChange={setQuery} onSelect={go} />
    </CommandDialog>
  )
}

interface SearchPaletteProps {
  query: string
  onQueryChange: (query: string) => void
  onSelect: (href: string) => void
}

function SearchPalette({ query, onQueryChange, onSelect }: SearchPaletteProps) {
  const { data, isUpdating } = useSearch({ q: query })
  const { data: home } = useQuery(homeQuery())
  const trimmed = query.trim()
  const suggestions = home?.searchSuggestions ?? ['resurrection', 'Isaiah 53', 'covenant']

  // A typed passage or book ("rom 8:28") is recognized here, instantly, so Enter
  // opens it without waiting for the server (which returns the same hit).
  const goTo = trimmed ? goToHits(trimmed) : []
  const serverGroups = (trimmed ? (data?.groups ?? []) : []).filter((group) => group.id !== 'reference')
  const groups: SearchGroup[] = goTo.length > 0 ? [{ id: 'reference', label: 'Go to', total: goTo.length, hits: goTo }, ...serverGroups] : serverGroups

  // Select the best match whenever it changes. Left alone, cmdk keeps whatever was
  // selected first: often "See all results", the only item while results load.
  const best = trimmed ? (groups[0]?.hits[0]?.id ?? 'see-all') : `suggestion-${suggestions[0]}`
  const [selection, setSelection] = useState({ best, value: best })
  if (selection.best !== best) setSelection({ best, value: best })

  return (
    <Command
      shouldFilter={false}
      loop
      label="Search"
      value={selection.value}
      onValueChange={(value) => setSelection({ best, value })}
    >
      <CommandInput value={query} onValueChange={onQueryChange} placeholder={placeholder} aria-label="Search" />
      <CommandList aria-busy={isUpdating} className={cn(isUpdating && 'opacity-80')}>
        {!trimmed && (
          <CommandGroup heading="Try">
            {suggestions.map((suggestion) => (
              <CommandItem key={suggestion} value={`suggestion-${suggestion}`} onSelect={() => onQueryChange(suggestion)}>
                <ArrowRight className="text-muted-foreground" />
                {suggestion}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {trimmed && !isUpdating && groups.length === 0 && (
          <p role="status" className="px-3 py-6 text-center text-sm text-muted-foreground">
            No results for “{trimmed}”. Try a book and chapter such as “Romans 8”, or a theme like “covenant”.
          </p>
        )}

        {groups.map((group) => (
          <CommandGroup key={group.id} heading={group.total > group.hits.length ? `${group.label} · ${group.total}` : group.label}>
            {group.hits.map((hit) => {
              const meta = hitMeta(hit)
              return (
                <CommandItem key={hit.id} value={hit.id} onSelect={() => onSelect(hitHref(hit))} className="items-start">
                  {(hit.type === 'reference' || hit.type === 'book') && <BookOpen className="mt-0.5 text-muted-foreground" />}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      {hit.type === 'entity' ? (
                        <Highlighted segments={hit.title} className="font-serif text-[0.9375rem] font-medium" />
                      ) : (
                        <span className="font-medium">{hitTitle(hit)}</span>
                      )}
                      {meta && <span className="shrink-0 text-xs text-muted-foreground">{meta}</span>}
                    </div>
                    <p className={cn('mt-0.5 line-clamp-1 text-[0.8125rem] text-muted-foreground')}>
                      <HitSnippet hit={hit} />
                    </p>
                  </div>
                </CommandItem>
              )
            })}
          </CommandGroup>
        ))}

        {trimmed && (
          <>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem value="see-all" onSelect={() => onSelect(`/search?q=${encodeURIComponent(trimmed)}`)}>
                <CornerDownLeft className="text-muted-foreground" />
                See all results for “{trimmed}”
              </CommandItem>
            </CommandGroup>
          </>
        )}
      </CommandList>
    </Command>
  )
}
