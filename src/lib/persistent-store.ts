import { useSyncExternalStore } from 'react'
import type { z } from 'zod'

export interface PersistentStore<T> {
  getSnapshot: () => T
  subscribe: (listener: () => void) => () => void
  /**
   * Applies a change and writes it to storage. Returns false, leaving the
   * state unchanged, when the browser refuses to store it (full, or disabled),
   * so callers never report something as saved that would vanish on reload.
   */
  update: (updater: (current: T) => T) => boolean
}

interface PersistentStoreOptions<T> {
  /**
   * Called when stored data fails validation: return what can be salvaged
   * (or undefined to fall back). Lets user data survive one bad entry.
   */
  recover?: (raw: unknown) => T | undefined
}

/**
 * A tiny localStorage-backed store for data kept in this browser.
 * Stored values are validated on read, so a corrupt or outdated entry is
 * recovered (or falls back to defaults) instead of crashing the app.
 * Other tabs stay in sync.
 */
export function createPersistentStore<T>(
  key: string,
  schema: z.ZodType<T>,
  fallback: T,
  { recover }: PersistentStoreOptions<T> = {},
): PersistentStore<T> {
  const read = (): T => {
    let raw: unknown
    try {
      const stored = localStorage.getItem(key)
      if (!stored) return fallback
      raw = JSON.parse(stored)
    } catch {
      return fallback
    }
    const parsed = schema.safeParse(raw)
    if (parsed.success) return parsed.data
    return recover?.(raw) ?? fallback
  }

  let state = read()
  const listeners = new Set<() => void>()
  const notify = () => listeners.forEach((listener) => listener())

  const onStorage = (event: StorageEvent) => {
    if (event.key !== key) return
    state = read()
    notify()
  }

  return {
    getSnapshot: () => state,
    subscribe(listener) {
      if (listeners.size === 0) window.addEventListener('storage', onStorage)
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
        if (listeners.size === 0) window.removeEventListener('storage', onStorage)
      }
    },
    update(updater) {
      const next = updater(state)
      try {
        localStorage.setItem(key, JSON.stringify(next))
      } catch {
        return false
      }
      state = next
      notify()
      return true
    },
  }
}

export function usePersistentStore<T>(store: PersistentStore<T>): T {
  return useSyncExternalStore(store.subscribe, store.getSnapshot)
}
