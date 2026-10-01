import { useSyncExternalStore } from 'react'
import type { z } from 'zod'

export interface PersistentStore<T> {
  getSnapshot: () => T
  subscribe: (listener: () => void) => () => void
  update: (updater: (current: T) => T) => void
}

/**
 * A tiny localStorage-backed store for user data that has no server yet.
 * Stored values are validated on read, so a corrupt or outdated entry falls
 * back to defaults instead of crashing the app. Other tabs stay in sync.
 */
export function createPersistentStore<T>(key: string, schema: z.ZodType<T>, fallback: T): PersistentStore<T> {
  const read = (): T => {
    try {
      const raw = localStorage.getItem(key)
      if (!raw) return fallback
      const parsed = schema.safeParse(JSON.parse(raw))
      return parsed.success ? parsed.data : fallback
    } catch {
      return fallback
    }
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
      state = updater(state)
      try {
        localStorage.setItem(key, JSON.stringify(state))
      } catch {
        // Storage can be full or unavailable (private mode); keep the in-memory state.
      }
      notify()
    },
  }
}

export function usePersistentStore<T>(store: PersistentStore<T>): T {
  return useSyncExternalStore(store.subscribe, store.getSnapshot)
}
