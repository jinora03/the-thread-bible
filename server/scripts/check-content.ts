// Validates every file in /content (schemas, references and cross-links).
// Runs in CI and before publishing; exits non-zero with a list of problems.
import { ContentValidationError, loadContent } from '../content/loader'
import { paths } from '../paths'

try {
  const preview = loadContent(paths.content, 'preview')
  const published = loadContent(paths.content, 'published')
  const statuses = new Map<string, number>()
  for (const entity of preview.entities.values()) statuses.set(entity.review.status, (statuses.get(entity.review.status) ?? 0) + 1)
  console.log(`✓ content is valid: ${preview.entities.size} entities, ${preview.connections.length} connections, ${preview.chapterNotes.length} chapter notes`)
  console.log(`  review status: ${[...statuses].map(([status, count]) => `${count} ${status}`).join(', ')}`)
  console.log(`  published (visible in production): ${published.entities.size} entities`)
} catch (error) {
  if (error instanceof ContentValidationError) {
    console.error(error.message)
    process.exit(1)
  }
  throw error
}
