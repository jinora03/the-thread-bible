// Downloads the public-domain USFM sources listed in server/scripture/sources.ts.
// Usage: npm run scripture:fetch   (skips files that already exist; pass --force to re-download)
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { paths } from '../paths'
import { localTranslations } from '../scripture/sources'

const force = process.argv.includes('--force')
mkdirSync(paths.sources, { recursive: true })

for (const translation of localTranslations) {
  const target = join(paths.sources, translation.sourceFile)
  if (existsSync(target) && !force) {
    console.log(`✓ ${translation.sourceFile} already present`)
    continue
  }
  console.log(`↓ ${translation.abbreviation}: ${translation.sourceUrl}`)
  const response = await fetch(translation.sourceUrl)
  if (!response.ok) throw new Error(`Download failed (${response.status}) for ${translation.sourceUrl}`)
  const bytes = new Uint8Array(await response.arrayBuffer())
  writeFileSync(target, bytes)
  console.log(`✓ saved ${translation.sourceFile} (${(bytes.length / 1024 / 1024).toFixed(2)} MB)`)
}
