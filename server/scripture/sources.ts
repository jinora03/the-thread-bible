import type { Translation } from '@shared/types/scripture'

/**
 * Public-domain translations served from our own database.
 * Source files are USFM zips from eBible.org, fetched by `npm run scripture:fetch`
 * and imported by `npm run scripture:import`.
 */
export const localTranslations: (Translation & { sourceUrl: string; sourceFile: string })[] = [
  {
    id: 'kjv',
    name: 'King James Version',
    abbreviation: 'KJV',
    language: 'en',
    license: 'Public domain outside the United Kingdom',
    attribution:
      'Scripture quotations are from the King James Version (1769 standard text), which is in the public domain outside the United Kingdom, where rights are vested in the Crown.',
    source: 'local',
    searchable: true,
    sourceUrl: 'https://ebible.org/Scriptures/eng-kjv2006_usfm.zip',
    sourceFile: 'eng-kjv2006_usfm.zip',
  },
  {
    id: 'bsb',
    name: 'Berean Standard Bible',
    abbreviation: 'BSB',
    language: 'en',
    license: 'Public domain',
    attribution:
      'Scripture quotations are from the Berean Standard Bible (BSB), which was dedicated to the public domain in 2023.',
    source: 'local',
    searchable: true,
    sourceUrl: 'https://ebible.org/Scriptures/engbsb_usfm.zip',
    sourceFile: 'engbsb_usfm.zip',
  },
]
