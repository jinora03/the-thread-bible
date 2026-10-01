// Starts the API for end-to-end tests on a fresh copy of the development
// database, so test accounts never land in the database you use day to day.
import { existsSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import Database from 'better-sqlite3'
import { paths } from '../server/paths.ts'

const source = join(paths.dataDir, 'thread-bible.db')
const target = process.env.DATABASE_PATH

if (!target || target === source) {
  console.error('Set DATABASE_PATH to a separate e2e database (playwright.config.ts does this).')
  process.exit(1)
}
if (!existsSync(source)) {
  console.error(`No Scripture database at ${source}. Run \`npm run setup\` before the end-to-end tests.`)
  process.exit(1)
}

rmSync(dirname(target), { recursive: true, force: true })
mkdirSync(dirname(target), { recursive: true })
const database = new Database(source, { readonly: true })
await database.backup(target)
database.close()

await import('../server/index.ts')
