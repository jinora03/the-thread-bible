import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { parse, stringify } from 'yaml'
import { paths } from '../paths'
import { ContentValidationError, loadContent } from './loader'

// Each test edits its own copy of the real content folder.
const copies: string[] = []
const copyContent = () => {
  const root = mkdtempSync(join(tmpdir(), 'ttb-content-'))
  cpSync(paths.content, root, { recursive: true })
  copies.push(root)
  return root
}
afterEach(() => {
  for (const root of copies.splice(0)) rmSync(root, { recursive: true, force: true })
})

const editYaml = (root: string, file: string, edit: (data: Record<string, unknown>) => void) => {
  const path = join(root, file)
  const data = parse(readFileSync(path, 'utf8')) as Record<string, unknown>
  edit(data)
  writeFileSync(path, stringify(data, { lineWidth: 0 }))
}

const problemsOf = (root: string) => {
  try {
    loadContent(root, 'preview')
  } catch (error) {
    if (error instanceof ContentValidationError) return error.problems
    throw error
  }
  return []
}

describe('loadContent', () => {
  it('accepts the content in the repository', () => {
    const store = loadContent(paths.content, 'preview')
    expect(store.entities.size).toBeGreaterThan(40)
    expect(store.connections.length).toBeGreaterThan(40)
    expect(store.entities.get('doctrine:resurrection')?.title).toBe('The Resurrection')
  })

  it('serves only published content at the published stage', () => {
    const root = copyContent()
    editYaml(root, 'themes/light.yaml', (data) => {
      data.review = {
        status: 'published',
        authors: ['The Thread Bible editors'],
        reviewers: [{ name: 'A. Reviewer', role: 'theological', date: '2026-09-01' }],
      }
    })
    const store = loadContent(root, 'published')
    expect([...store.entities.keys()]).toEqual(['theme:light'])
    // Connections to entities that are not visible are dropped rather than left dangling.
    for (const connection of store.connections) {
      for (const endpoint of [connection.source, connection.target]) {
        if (endpoint.type === 'entity') expect(store.entities.has(endpoint.id)).toBe(true)
      }
    }
  })

  it('reports every problem at once, with file and field', () => {
    const root = copyContent()
    editYaml(root, 'themes/kingdom.yaml', (data) => {
      data.relatedIds = ['theme:does-not-exist']
    })
    editYaml(root, 'themes/light.yaml', (data) => {
      data.keyReferences = ['Hezekiah 1:1']
    })
    editYaml(root, 'themes/grace.yaml', (data) => {
      data.review = { status: 'published', authors: ['The Thread Bible editors'], reviewers: [] }
    })
    writeFileSync(join(root, 'themes/faith.yaml'), 'title: [unclosed')
    writeFileSync(join(root, 'themes/Bad_Name.yaml'), readFileSync(join(root, 'themes/kingdom.yaml')))

    const problems = problemsOf(root).join('\n')
    expect(problems).toContain('themes/kingdom.yaml: links to "theme:does-not-exist", which does not exist')
    expect(problems).toContain('themes/light.yaml → keyReferences.0: "Hezekiah 1:1" is not a valid Scripture reference')
    expect(problems).toContain('themes/grace.yaml → review.reviewers: Published content must record at least one completed review')
    expect(problems).toMatch(/themes\/faith\.yaml: invalid YAML/)
    expect(problems).toMatch(/themes\/Bad_Name\.yaml: file names become URLs/)
    // An invalid file is reported once, not again at every page that links to it.
    expect(problems).not.toMatch(/links to "theme:(light|grace|faith)"/)
  })

  it('rejects the long dash anywhere in a file', () => {
    const root = copyContent()
    const dash = String.fromCharCode(0x2014)
    editYaml(root, 'themes/light.yaml', (data) => {
      data.summary = `Light${dash}from the first day onward.`
    })
    const problems = problemsOf(root).join('\n')
    expect(problems).toMatch(/themes\/light\.yaml → summary: avoid the long dash/)
  })

  it('catches broken rich-text links and duplicate connection ids', () => {
    const root = copyContent()
    editYaml(root, 'themes/light.yaml', (data) => {
      data.summary = 'See [[doctrine:nowhere]].'
    })
    editYaml(root, 'connections/genesis.yaml', (data) => {
      const connections = data.connections as { id: string }[]
      connections.push({ ...connections[0]! })
    })

    const problems = problemsOf(root).join('\n')
    expect(problems).toContain('themes/light.yaml: links to "doctrine:nowhere", which does not exist')
    expect(problems).toMatch(/connections\/: the id ".+" is used more than once/)
  })
})
