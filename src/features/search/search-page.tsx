import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { Form, Link, useSearchParams } from 'react-router'
import { z } from 'zod'
import { EmptyState } from '@/components/content/empty-state'
import { PageContainer } from '@/components/layout/page-container'
import { Heading } from '@/components/typography/heading'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { pageTitle } from '@/config/site'
import { hitHref, hitMeta, hitTitle } from '@/features/search/hit-format'
import { Highlighted, HitSnippet } from '@/features/search/search-hits'
import { useSearch } from '@/features/search/use-search'
import { useTranslation } from '@/hooks/use-scripture'
import { cn } from '@/lib/utils'
import { homeQuery } from '@/services/content'
import type { SearchFilter, SearchGroup, SearchResponse } from '@shared/types/search'

const PAGE_SIZE = 20

// Everything comes from the URL, so treat it as untrusted input.
const searchParamsSchema = z.object({
  q: z.string().trim().max(200).catch(''),
  type: z.enum(['all', 'scripture', 'theme', 'doctrine', 'prophecy', 'study', 'people-places', 'more']).catch('all'),
  testament: z.enum(['old', 'new']).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(500).catch(1),
})

const filters: { id: SearchFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'scripture', label: 'Scripture' },
  { id: 'theme', label: 'Topics' },
  { id: 'doctrine', label: 'Doctrines' },
  { id: 'prophecy', label: 'Prophecy' },
  { id: 'study', label: 'Studies' },
  { id: 'people-places', label: 'People & Places' },
  { id: 'more', label: 'More' },
]

type Params = z.infer<typeof searchParamsSchema>

function searchHref(params: Params, changes: Partial<Params>) {
  const next = { ...params, ...changes }
  const query = new URLSearchParams({ q: next.q })
  if (next.type !== 'all') query.set('type', next.type)
  if (next.testament && next.type === 'scripture') query.set('testament', next.testament)
  if (next.page > 1) query.set('page', String(next.page))
  return `/search?${query}`
}

export function SearchPage() {
  const [searchParams] = useSearchParams()
  const params = searchParamsSchema.parse(Object.fromEntries(searchParams))

  return (
    <PageContainer width="article" className="py-10 sm:py-14 lg:py-16">
      <title>{pageTitle(params.q ? `“${params.q}”` : 'Search')}</title>
      <Heading level={1} variant="title">
        Search
      </Heading>

      <Form method="get" action="/search" role="search" className="mt-6 flex flex-col gap-2 sm:flex-row">
        <label htmlFor="search-page-input" className="sr-only">
          Search Scripture and the library
        </label>
        <div className="relative flex-1">
          <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            // Remount when the URL query changes so the field reflects it.
            key={params.q}
            id="search-page-input"
            name="q"
            type="search"
            defaultValue={params.q}
            placeholder="Search Scripture, doctrine, prophecy, people, themes…"
            className="h-12 pl-10 text-base text-ellipsis"
          />
        </div>
        {params.type !== 'all' && <input type="hidden" name="type" value={params.type} />}
        <Button type="submit" size="lg">
          Search
        </Button>
      </Form>

      <div className="mt-8">{params.q ? <SearchResults params={params} /> : <SearchSuggestions />}</div>
    </PageContainer>
  )
}

function SearchSuggestions() {
  const { data: home } = useQuery(homeQuery())
  return (
    <div>
      <p className="text-muted-foreground">
        Search the text of Scripture and the study library together. Try a reference, a phrase in “quotes”, a theme or a name.
      </p>
      <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
        {(home?.searchSuggestions ?? []).map((suggestion) => (
          <li key={suggestion}>
            <Link to={`/search?q=${encodeURIComponent(suggestion)}`} className="font-serif text-lg text-reference link-quiet">
              {suggestion}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

function SearchResults({ params }: { params: Params }) {
  const translation = useTranslation()
  const filtered = params.type !== 'all'
  const { data, isPending, isError, refetch, isUpdating } = useSearch({
    q: params.q,
    filter: params.type,
    testament: params.type === 'scripture' ? params.testament : undefined,
    limit: filtered ? PAGE_SIZE : 5,
    offset: filtered ? (params.page - 1) * PAGE_SIZE : 0,
  })

  if (isPending) {
    return (
      <div role="status" aria-label="Searching" className="space-y-4">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    )
  }

  if (isError) {
    return (
      <EmptyState
        title="Search didn’t complete"
        description={`Something interrupted the search for “${params.q}”. Your query is still in the box above.`}
        action={<Button onClick={() => refetch()}>Try again</Button>}
      />
    )
  }

  const total = Object.values(data.facets).reduce((sum, count) => sum + (count ?? 0), 0)
  const referenceGroup = data.groups.find((group) => group.id === 'reference')

  return (
    <div className={cn('transition-opacity', isUpdating && 'opacity-60')}>
      <FilterTabs params={params} response={data} />

      <p role="status" className="mt-6 text-sm text-muted-foreground">
        {total === 0
          ? `No matches for “${params.q}”`
          : `${total.toLocaleString()} ${total === 1 ? 'match' : 'matches'} for “${params.q}” · Scripture in the ${translation.name}`}
      </p>

      {params.type === 'scripture' && <TestamentFilter params={params} />}

      {total === 0 && !referenceGroup ? (
        <EmptyState
          className="mt-8"
          title={`Nothing found for “${params.q}”`}
          description={
            <>
              Try fewer words, a different spelling, or a reference such as “Romans 8”. Scripture is searched in the{' '}
              {translation.name}; older wording (“hath”, “saith”) may match where modern words don’t. You can also{' '}
              <Link to="/explore" className="text-reference link-quiet">
                browse Explore
              </Link>
              .
            </>
          }
        />
      ) : (
        <div className="mt-8 space-y-12">
          {data.groups.map((group) => (
            <ResultGroup key={group.id} group={group} params={params} />
          ))}
        </div>
      )}

      {filtered && <Pagination params={params} total={data.groups.find((group) => group.id === params.type)?.total ?? 0} />}
    </div>
  )
}

function FilterTabs({ params, response }: { params: Params; response: SearchResponse }) {
  return (
    <nav aria-label="Filter results">
      <ul className="-mx-1 flex gap-4 overflow-x-auto border-b px-1 [scrollbar-width:none]">
        {filters.map((filter) => {
          const count = filter.id === 'all' ? undefined : (response.facets[filter.id] ?? 0)
          const active = params.type === filter.id
          if (count === 0 && !active) return null
          return (
            <li key={filter.id} className="shrink-0">
              <Link
                to={searchHref(params, { type: filter.id, page: 1, testament: undefined })}
                aria-current={active ? 'page' : undefined}
                // "Scripture, 19 results" rather than a bare "Scripture 19".
                aria-label={count === undefined ? undefined : `${filter.label}, ${count.toLocaleString()} ${count === 1 ? 'result' : 'results'}`}
                className={cn(
                  '-mb-px inline-flex h-10 items-center gap-1.5 border-b-2 text-sm font-medium whitespace-nowrap transition-colors',
                  active ? 'border-primary text-foreground dark:border-reference' : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {filter.label}
                {count !== undefined && <span className="text-xs text-muted-foreground tabular-nums">{count.toLocaleString()}</span>}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

function TestamentFilter({ params }: { params: Params }) {
  const options: { value: Params['testament']; label: string }[] = [
    { value: undefined, label: 'Whole Bible' },
    { value: 'old', label: 'Old Testament' },
    { value: 'new', label: 'New Testament' },
  ]
  return (
    <nav aria-label="Limit Scripture results" className="mt-4">
      <ul className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = params.testament === option.value
          return (
            <li key={option.label}>
              <Link
                to={searchHref(params, { testament: option.value, page: 1 })}
                aria-current={active ? 'true' : undefined}
                className={cn(
                  'inline-flex h-8 items-center rounded-md px-3 text-sm transition-colors',
                  active ? 'bg-surface-subtle font-medium text-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
              >
                {option.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

function ResultGroup({ group, params }: { group: SearchGroup; params: Params }) {
  const headingId = `results-${group.id}`
  const showAll = params.type === 'all' && group.id !== 'reference' && group.total > group.hits.length

  return (
    <section aria-labelledby={headingId}>
      <div className="flex items-baseline justify-between gap-4">
        <Heading level={2} variant="label" id={headingId}>
          {group.label}
        </Heading>
        {showAll && (
          <Link to={searchHref(params, { type: group.id as SearchFilter, page: 1 })} className="text-sm font-medium text-reference link-quiet">
            All {group.total.toLocaleString()}
            <span className="sr-only"> {group.label} results</span>
          </Link>
        )}
      </div>
      <ul className="mt-3">
        {group.hits.map((hit) => {
          const meta = hitMeta(hit)
          return (
            <li key={hit.id} className="border-t py-4 first:border-t-0 first:pt-2">
              <Link to={hitHref(hit)} className="group block">
                <span className="flex flex-wrap items-baseline gap-x-3">
                  {hit.type === 'entity' ? (
                    <Highlighted segments={hit.title} className="font-serif text-lg text-foreground group-hover:text-primary dark:group-hover:text-reference" />
                  ) : (
                    <span className="font-medium text-foreground group-hover:text-primary dark:group-hover:text-reference">{hitTitle(hit)}</span>
                  )}
                  {meta && <span className="text-xs text-muted-foreground">{meta}</span>}
                </span>
                <span className={cn('mt-1 block leading-relaxed text-muted-foreground', hit.type === 'verse' ? 'text-[1.0625rem]' : 'line-clamp-2 text-sm')}>
                  <HitSnippet hit={hit} />
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function Pagination({ params, total }: { params: Params; total: number }) {
  const pages = Math.ceil(total / PAGE_SIZE)
  if (pages <= 1) return null
  return (
    <nav aria-label="Result pages" className="mt-10 flex items-center justify-between border-t pt-6 text-sm">
      {params.page > 1 ? (
        <Link to={searchHref(params, { page: params.page - 1 })} className="font-medium text-reference link-quiet">
          ← Previous
        </Link>
      ) : (
        <span />
      )}
      <span className="text-muted-foreground">
        Page {params.page} of {pages}
      </span>
      {params.page < pages ? (
        <Link to={searchHref(params, { page: params.page + 1 })} className="font-medium text-reference link-quiet">
          Next →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  )
}
