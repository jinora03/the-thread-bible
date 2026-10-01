import type { EntityId } from './content'
import type { ScriptureReference } from './scripture'

export type ConnectionType =
  | 'prophecy-fulfillment'
  | 'type-antitype'
  | 'cross-reference'
  | 'supports-doctrine'
  | 'contrasts'
  | 'parallel'
  | 'quotation'
  | 'allusion'
  | 'genealogy'
  | 'timeline'
  | 'covenant'
  | 'promise-fulfillment'

/**
 * How firmly a connection is grounded, kept separate so the UI can always
 * distinguish what the text says from what is offered more cautiously.
 * - `stated`: Scripture itself makes the link (explicit quotation or citation).
 * - `supported`: a clear echo or recurring pattern, supported by several passages.
 * - `suggested`: a possible link, offered with caution.
 */
export type ConnectionBasis = 'stated' | 'supported' | 'suggested'

export type ConnectionEndpoint =
  | { type: 'scripture'; reference: ScriptureReference }
  | { type: 'entity'; id: EntityId }

export interface Connection {
  id: string
  type: ConnectionType
  source: ConnectionEndpoint
  target: ConnectionEndpoint
  basis: ConnectionBasis
  /** A short, neutral description of what links the two endpoints. */
  description?: string
  /** Additional passages that support or illustrate the connection. */
  scriptureReferences?: ScriptureReference[]
}

/** A curated, ordered path through Scripture: "the thread". */
export interface Thread {
  id: string
  title: string
  steps: ThreadStep[]
}

export interface ThreadStep {
  reference: ScriptureReference
  title: string
  /** Relationship to the previous step, e.g. "promise" or "fulfillment". */
  label: string
}

/**
 * A connection seen from one side: `here` is the endpoint that matched the
 * query (this entity, this chapter), `there` is where the connection leads.
 */
export interface ConnectionView {
  connection: Connection
  here: ConnectionEndpoint
  there: ConnectionEndpoint
  direction: 'outgoing' | 'incoming'
}

export interface ParallelGroup {
  /** The verse in the passage where these connections start. */
  source: ScriptureReference
  /** The phrase that labels the row, taken from the first connection. */
  label: string
  views: ConnectionView[]
}
