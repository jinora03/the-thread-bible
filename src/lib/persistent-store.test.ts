import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { createPersistentStore } from './persistent-store'

const schema = z.object({ count: z.number().int() })
const fallback = { count: 0 }

describe('createPersistentStore', () => {
  it('starts from the fallback when nothing is stored', () => {
    expect(createPersistentStore('test-store', schema, fallback).getSnapshot()).toEqual(fallback)
  })

  it('reads and validates stored values', () => {
    localStorage.setItem('test-store', JSON.stringify({ count: 3 }))
    expect(createPersistentStore('test-store', schema, fallback).getSnapshot()).toEqual({ count: 3 })
  })

  it.each([['not json'], [JSON.stringify({ count: 'three' })], [JSON.stringify(null)]])(
    'falls back instead of crashing on %j',
    (raw) => {
      localStorage.setItem('test-store', raw)
      expect(createPersistentStore('test-store', schema, fallback).getSnapshot()).toEqual(fallback)
    },
  )

  it('persists updates and notifies subscribers', () => {
    const store = createPersistentStore('test-store', schema, fallback)
    const listener = vi.fn()
    const unsubscribe = store.subscribe(listener)

    store.update((state) => ({ count: state.count + 1 }))
    expect(store.getSnapshot()).toEqual({ count: 1 })
    expect(JSON.parse(localStorage.getItem('test-store')!)).toEqual({ count: 1 })
    expect(listener).toHaveBeenCalledTimes(1)

    unsubscribe()
    store.update((state) => ({ count: state.count + 1 }))
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('picks up changes made in other tabs', () => {
    const store = createPersistentStore('test-store', schema, fallback)
    const listener = vi.fn()
    store.subscribe(listener)

    localStorage.setItem('test-store', JSON.stringify({ count: 7 }))
    window.dispatchEvent(new StorageEvent('storage', { key: 'test-store' }))
    window.dispatchEvent(new StorageEvent('storage', { key: 'another-key' }))

    expect(store.getSnapshot()).toEqual({ count: 7 })
    expect(listener).toHaveBeenCalledTimes(1)
  })
})
