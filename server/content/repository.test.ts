import { describe, expect, it } from 'vitest'
import type { Entity, EntityId } from '@shared/types/content'
import type { ContentStore } from './loader'
import { createContentRepository } from './repository'

const review = { status: 'published' as const, authors: ['Editors'], reviewers: [] }
const theme = (slug: string): Entity => ({ id: `theme:${slug}`, kind: 'theme', slug, title: slug, summary: slug, keyReferences: [], review })

function storeWith(entities: Entity[]): ContentStore {
  return {
    stage: 'published',
    entities: new Map(entities.map((entity) => [entity.id, entity])),
    connections: [],
    chapterNotes: [],
    threads: new Map(),
    home: { todaysScripture: { book: 'john', chapter: 1, verse: 14 }, featuredStudyId: 'study:none' as EntityId, featuredThreadId: 'none', themeIds: [], searchSuggestions: [] },
  }
}

describe('getEntity related summaries', () => {
  it('collects links written inside prose, at any depth, once each', () => {
    const doctrine: Entity = {
      id: 'doctrine:resurrection',
      kind: 'doctrine',
      slug: 'resurrection',
      title: 'The Resurrection',
      summary: 'Summary',
      category: 'Christ',
      keyReferences: [],
      relatedIds: ['theme:listed'],
      review,
      article: {
        keyScriptures: [{ book: '1-corinthians', chapter: 15, verse: 20 }],
        teaching: ['See [[theme:in-an-array]].'],
        foundation: { oldTestament: ['[[theme:nested|nested]] deep in an object.'], newTestament: ['Again [[theme:in-an-array]].'] },
        insights: [{ title: 'Insight', body: 'Links to [[theme:in-a-list-of-objects]].' }],
        questions: [],
        furtherStudyIds: [],
      },
    }
    const repository = createContentRepository(
      storeWith([doctrine, theme('listed'), theme('in-an-array'), theme('nested'), theme('in-a-list-of-objects')]),
    )

    const ids = repository.getEntity('doctrine', 'resurrection')!.related.map((summary) => summary.id)
    expect(ids.sort()).toEqual(['theme:in-a-list-of-objects', 'theme:in-an-array', 'theme:listed', 'theme:nested'])
  })

  it('leaves out linked entries that are not visible at this stage', () => {
    const entry: Entity = { ...theme('visible'), summary: 'See [[theme:hidden]] and [[theme:visible-too]].' }
    const repository = createContentRepository(storeWith([entry, theme('visible-too')]))
    expect(repository.getEntity('theme', 'visible')!.related.map((summary) => summary.id)).toEqual(['theme:visible-too'])
  })
})
