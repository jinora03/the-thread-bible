import { z } from 'zod'
import { createPersistentStore, usePersistentStore } from '@/lib/persistent-store'

const readerPreferencesSchema = z.object({
  translationId: z.string().min(1).default('kjv'),
  mode: z.enum(['reading', 'study']),
  textSize: z.enum(['sm', 'md', 'lg', 'xl']),
  contextPanelOpen: z.boolean(),
})

export type ReaderPreferences = z.infer<typeof readerPreferencesSchema>
export type TextSize = ReaderPreferences['textSize']

const readerPreferencesStore = createPersistentStore<ReaderPreferences>('ttb-reader', readerPreferencesSchema, {
  translationId: 'kjv',
  mode: 'reading',
  textSize: 'md',
  contextPanelOpen: true,
})

export function useReaderPreferences() {
  return usePersistentStore(readerPreferencesStore)
}

/** For route loaders, which run outside React. */
export function getReaderPreferences() {
  return readerPreferencesStore.getSnapshot()
}

export function setReaderPreference<K extends keyof ReaderPreferences>(key: K, value: ReaderPreferences[K]) {
  readerPreferencesStore.update((current) => ({ ...current, [key]: value }))
}
