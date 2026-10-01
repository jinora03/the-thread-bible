import type { ConnectionBasis, ConnectionType } from '@shared/types/connections'

export const connectionTypeLabels: Record<ConnectionType, string> = {
  'prophecy-fulfillment': 'Prophecy → Fulfillment',
  'type-antitype': 'Type → Antitype',
  'cross-reference': 'Cross-reference',
  'supports-doctrine': 'Supports doctrine',
  contrasts: 'Contrast',
  parallel: 'Parallel',
  quotation: 'Quotation',
  allusion: 'Allusion',
  genealogy: 'Genealogy',
  timeline: 'Timeline',
  covenant: 'Covenant',
  'promise-fulfillment': 'Promise → Fulfillment',
}

export const connectionBasisLabels: Record<ConnectionBasis, { label: string; description: string }> = {
  stated: {
    label: 'Stated in Scripture',
    description: 'Scripture itself makes this link, by quotation or explicit reference.',
  },
  supported: {
    label: 'Supported across Scripture',
    description: 'A clear echo or recurring pattern that several passages support, though not an explicit citation.',
  },
  suggested: {
    label: 'Suggested connection',
    description: 'A possible link, offered with caution. The passages are listed so you can weigh it yourself.',
  },
}
