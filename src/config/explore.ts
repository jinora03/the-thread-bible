import type { EntityKind } from '@shared/types/content'

export type ExploreGroupId = 'scripture' | 'history' | 'theology'

export interface ExploreCollection {
  slug: string
  /** The entity kind listed in this collection. Timeline has none yet. */
  kind?: EntityKind
  title: string
  description: string
  group: ExploreGroupId
  status: 'available' | 'planned'
}

export const exploreGroups: { id: ExploreGroupId; title: string; description: string }[] = [
  {
    id: 'scripture',
    title: 'Scripture & Doctrine',
    description: 'What Scripture teaches, promises and foreshadows, and where its threads converge.',
  },
  {
    id: 'history',
    title: 'People & History',
    description: 'The people, places and events through which the biblical story unfolds.',
  },
  {
    id: 'theology',
    title: 'Biblical Theology',
    description: 'The large structures that hold the story together across both Testaments.',
  },
]

export const exploreCollections: ExploreCollection[] = [
  {
    slug: 'prophecies',
    kind: 'prophecy',
    title: 'Prophecies',
    description: 'Prophetic passages, their historical setting, and how the New Testament reads them.',
    group: 'scripture',
    status: 'available',
  },
  {
    slug: 'doctrines',
    kind: 'doctrine',
    title: 'Doctrines',
    description: 'Core Christian teachings, with the Scriptures that ground them and the questions they raise.',
    group: 'scripture',
    status: 'available',
  },
  {
    slug: 'themes',
    kind: 'theme',
    title: 'Themes',
    description: 'Ideas that run through many books: covenant, kingdom, sacrifice, glory.',
    group: 'scripture',
    status: 'available',
  },
  {
    slug: 'typology',
    kind: 'typology',
    title: 'Typology',
    description: 'People, events and institutions that the New Testament presents as patterns of Christ.',
    group: 'scripture',
    status: 'available',
  },
  {
    slug: 'people',
    kind: 'person',
    title: 'People',
    description: 'Patriarchs, prophets, kings and apostles, and the passages where they appear.',
    group: 'history',
    status: 'available',
  },
  {
    slug: 'places',
    kind: 'place',
    title: 'Places',
    description: 'Mountains, cities and regions, with their significance in the story.',
    group: 'history',
    status: 'available',
  },
  {
    slug: 'events',
    kind: 'event',
    title: 'Events',
    description: 'Key moments in the biblical narrative and where they are recounted.',
    group: 'history',
    status: 'available',
  },
  {
    slug: 'timeline',
    title: 'Timeline',
    description: 'People and events in the order Scripture tells them.',
    group: 'history',
    status: 'planned',
  },
  {
    slug: 'covenants',
    kind: 'covenant',
    title: 'Covenants',
    description: 'The covenants with Noah, Abraham, Israel and David, and the promised new covenant.',
    group: 'theology',
    status: 'available',
  },
  {
    slug: 'promises',
    kind: 'promise',
    title: 'Promises',
    description: 'Promises God makes, how they are repeated, and where they are kept.',
    group: 'theology',
    status: 'available',
  },
  {
    slug: 'symbols',
    kind: 'symbol',
    title: 'Symbols',
    description: 'Recurring images (lamb, vine, water, light) traced across Scripture.',
    group: 'theology',
    status: 'planned',
  },
  {
    slug: 'genealogies',
    kind: 'genealogy',
    title: 'Genealogies',
    description: 'Family lines that carry the promise, from Adam to David to Jesus.',
    group: 'theology',
    status: 'planned',
  },
]

export const entityKindLabels: Record<EntityKind, string> = {
  doctrine: 'Doctrine',
  prophecy: 'Prophecy',
  theme: 'Theme',
  typology: 'Typology',
  person: 'Person',
  place: 'Place',
  event: 'Event',
  covenant: 'Covenant',
  promise: 'Promise',
  symbol: 'Symbol',
  genealogy: 'Genealogy',
  study: 'Study',
}

export function getCollection(slug: string) {
  return exploreCollections.find((collection) => collection.slug === slug)
}

export function getCollectionForKind(kind: EntityKind) {
  return exploreCollections.find((collection) => collection.kind === kind)
}
