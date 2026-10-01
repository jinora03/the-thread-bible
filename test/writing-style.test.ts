import { readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

// House style (content/GUIDELINES.md): no long dash anywhere we write text,
// including UI copy, content, docs and comments. Scripture text from the
// translations is imported data, not a file here, so it is untouched.
const LONG_DASH = String.fromCharCode(0x2014)
const root = join(import.meta.dirname, '..')
const folders = ['src', 'server', 'shared', 'content', 'e2e', 'test']
const files = ['README.md', 'index.html', 'vite.config.ts', 'vitest.config.ts', 'playwright.config.ts']
const extensions = new Set(['.ts', '.tsx', '.css', '.html', '.md', '.yaml', '.json', '.sql'])

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return walk(path)
    return extensions.has(extname(name)) ? [path] : []
  })
}

describe('writing style', () => {
  it('uses no long dashes', () => {
    const offenders = [...folders.flatMap((folder) => walk(join(root, folder))), ...files.map((file) => join(root, file))].flatMap(
      (path) =>
        readFileSync(path, 'utf8')
          .split('\n')
          .flatMap((line, index) => (line.includes(LONG_DASH) ? [`${relative(root, path)}:${index + 1}`] : [])),
    )
    expect(offenders).toEqual([])
  })
})
