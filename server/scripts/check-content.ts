// Validates every file in /content (schemas, references and cross-links), checks
// references against the imported Bible text, and reports what production would show.
//   npm run content:check          validity (fails on problems) + readiness report
//   npm run content:check:release  also fails if production would not be ready
import { existsSync } from 'node:fs'
import Database from 'better-sqlite3'
import { ContentValidationError, loadContent } from '../content/loader'
import { productionReadiness } from '../content/readiness'
import { checkReferenceAvailability, contentItems } from '../content/reference-check'
import { loadEnv } from '../env'
import { paths } from '../paths'
import { createVerseIndex } from '../scripture/verse-index'

const requireRelease = process.argv.includes('--release')
let failed = false

try {
  const preview = loadContent(paths.content, 'preview')
  const published = loadContent(paths.content, 'published')
  const statuses = new Map<string, number>()
  for (const entity of preview.entities.values()) statuses.set(entity.review.status, (statuses.get(entity.review.status) ?? 0) + 1)
  console.log(`✓ content is valid: ${preview.entities.size} entities, ${preview.connections.length} connections, ${preview.chapterNotes.length} chapter notes`)
  console.log(`  review status: ${[...statuses].map(([status, count]) => `${count} ${status}`).join(', ')}`)

  // References against the Bible text (needs `npm run setup`).
  const { DATABASE_PATH } = loadEnv()
  if (DATABASE_PATH !== ':memory:' && existsSync(DATABASE_PATH)) {
    const sqlite = new Database(DATABASE_PATH, { readonly: true })
    const { errors, notes } = checkReferenceAvailability(contentItems(preview), createVerseIndex(sqlite))
    sqlite.close()
    if (errors.length > 0) {
      failed = true
      console.error(`\n✗ ${errors.length} reference(s) point past the end of a chapter:\n${errors.map((line) => `  • ${line}`).join('\n')}`)
    } else {
      console.log('✓ every reference exists in the Bible text')
    }
    if (notes.length > 0) console.log(`  note: some translations omit these verses, so the reader shows a gap:\n${notes.map((line) => `    ${line}`).join('\n')}`)
  } else {
    console.log('  (verse check skipped: no Scripture database yet. Run npm run setup.)')
  }

  // What production would show. Publishing is an editorial decision recorded in each file.
  const readiness = productionReadiness(preview, published)
  console.log(`\nProduction (CONTENT_STAGE=published) would show:\n${readiness.lines.map((line) => `  ${line}`).join('\n')}`)
  if (readiness.ready) {
    console.log('✓ ready for production')
  } else {
    console.log(`${requireRelease ? '✗' : '!'} not ready for production:\n${readiness.problems.map((line) => `  • ${line}`).join('\n')}`)
    console.log('  Publish entries by recording a completed review in their files (see content/README.md).')
    if (requireRelease) failed = true
  }
} catch (error) {
  if (error instanceof ContentValidationError) {
    console.error(error.message)
    process.exit(1)
  }
  throw error
}

if (failed) process.exit(1)
