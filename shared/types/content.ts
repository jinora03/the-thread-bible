import type { ScriptureReference } from './scripture'

/**
 * Every kind of study/reference entity in the library.
 * Scripture itself is not an entity; it is addressed by `ScriptureReference`.
 */
export type EntityKind =
  | 'doctrine'
  | 'prophecy'
  | 'theme'
  | 'typology'
  | 'person'
  | 'place'
  | 'event'
  | 'covenant'
  | 'promise'
  | 'symbol'
  | 'genealogy'
  | 'study'

export type EntityId<K extends EntityKind = EntityKind> = `${K}:${string}`

/**
 * Editorial prose. Plain strings that may contain inline tokens:
 * `[[John 1:29]]`, `[[John 1:29|the Lamb of God]]`, `[[theme:covenant]]`, `[[theme:covenant|covenant]]`.
 */
export type RichText = string

/**
 * Editorial workflow. Only `published` content is served in production;
 * development runs in preview mode and labels anything not yet published.
 */
export type ReviewStatus = 'draft' | 'in-review' | 'published'

export interface Reviewer {
  name: string
  role: 'theological' | 'editorial' | 'historical'
  /** ISO date (YYYY-MM-DD) the review was completed. */
  date: string
}

export interface ReviewInfo {
  status: ReviewStatus
  authors: string[]
  reviewers: Reviewer[]
  note?: string
}

export interface EntityBase<K extends EntityKind> {
  id: EntityId<K>
  kind: K
  slug: string
  title: string
  summary: string
  keyReferences: ScriptureReference[]
  relatedIds?: EntityId[]
  /** Free-form lowercase keywords used by search. */
  tags?: string[]
  /** A chain-reference thread to trace from this entry. */
  threadId?: string
  review: ReviewInfo
}

/** The small shape used for links, lists and related-content rows. */
export interface EntitySummary {
  id: EntityId
  kind: EntityKind
  slug: string
  title: string
  summary: string
  reviewStatus: ReviewStatus
  /** Person role or place region, shown as secondary metadata. */
  subtitle?: string
}

export interface QuestionAnswer {
  question: string
  answer: RichText[]
}

export interface DoctrineArticle {
  keyScriptures: ScriptureReference[]
  /** What Scripture teaches, summarized briefly. */
  teaching: RichText[]
  foundation: {
    oldTestament: RichText[]
    newTestament: RichText[]
  }
  insights: { title: string; body: RichText }[]
  questions: QuestionAnswer[]
  /** Only where a disagreement materially changes the meaning; short and secondary. */
  interpretationNote?: RichText
  furtherStudyIds: EntityId[]
}

export interface Doctrine extends EntityBase<'doctrine'> {
  category: string
  article?: DoctrineArticle
}

export interface ProphecyDetail {
  historicalContext: RichText[]
  keyWording: { label: string; reference: ScriptureReference; note: RichText }[]
  oldTestament: ScriptureReference[]
  /** How the New Testament writers use the passage, shown above the comparison. */
  connectionsIntroduction: RichText
  themeIds: EntityId<'theme'>[]
  /** Only where a disagreement materially changes the meaning; short and secondary. */
  interpretationNote?: RichText
  relatedStudyIds: EntityId<'study'>[]
}

export interface Prophecy extends EntityBase<'prophecy'> {
  passage: ScriptureReference
  classification: string[]
  detail?: ProphecyDetail
}

export interface StudySection {
  id: string
  title: string
  passage?: ScriptureReference
  body: RichText[]
}

export interface Study extends EntityBase<'study'> {
  readingMinutes: number
  author: string
  intro?: RichText[]
  sections?: StudySection[]
}

export type Theme = EntityBase<'theme'>
export type Typology = EntityBase<'typology'>
export type Person = EntityBase<'person'> & { role: string }
export type Place = EntityBase<'place'> & { region?: string }
export type BiblicalEvent = EntityBase<'event'>
export type Covenant = EntityBase<'covenant'>
export type BiblicalPromise = EntityBase<'promise'>
export type BiblicalSymbol = EntityBase<'symbol'>
export type Genealogy = EntityBase<'genealogy'>

export type Entity =
  | Doctrine
  | Prophecy
  | Study
  | Theme
  | Typology
  | Person
  | Place
  | BiblicalEvent
  | Covenant
  | BiblicalPromise
  | BiblicalSymbol
  | Genealogy

/** Curated study notes for a chapter, shown in the reader's context panel. */
export interface ChapterContext {
  bookId: string
  chapter: number
  /** Editorial overview: commentary, not Scripture. */
  overview: RichText
  relatedScripture: ScriptureReference[]
  relatedIds: EntityId[]
  crossReferences: { verse: number; references: ScriptureReference[] }[]
  review: ReviewInfo
}
