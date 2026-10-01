// Imports the downloaded USFM sources into SQLite and rebuilds the search index.
// Usage: npm run scripture:import   (run npm run scripture:fetch first)
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { strFromU8, unzipSync } from 'fflate'
import { createDatabase } from '../db/client'
import { loadEnv } from '../env'
import { paths } from '../paths'
import { importUsfmBooks, rebuildSearchIndex } from '../scripture/import'
import { localTranslations } from '../scripture/sources'

const env = loadEnv()
const { sqlite } = createDatabase(env.DATABASE_PATH)

for (const translation of localTranslations) {
  const zipPath = join(paths.sources, translation.sourceFile)
  if (!existsSync(zipPath)) {
    console.warn(`! ${translation.abbreviation}: ${translation.sourceFile} not found. Run npm run scripture:fetch`)
    continue
  }

  const files = unzipSync(new Uint8Array(readFileSync(zipPath)))
  const sources = Object.entries(files)
    .filter(([name]) => name.endsWith('.usfm'))
    .map(([, bytes]) => strFromU8(bytes))
  const { verses, problems } = importUsfmBooks(sqlite, translation.id, sources)

  console.log(`✓ ${translation.abbreviation}: ${verses.toLocaleString()} verses`)
  for (const problem of problems) console.warn(`  ! ${problem}`)
}

console.log('… rebuilding the search index')
rebuildSearchIndex(sqlite)
console.log('✓ done')
sqlite.close()
