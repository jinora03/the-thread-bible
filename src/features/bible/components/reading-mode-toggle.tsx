import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { setReaderPreference, useReaderPreferences } from '@/hooks/reader-preferences'
import type { ReadingMode } from '@shared/types/scripture'

/** Reading: flowing paragraphs. Study: verse by verse, with references inline. */
export function ReadingModeToggle({ labelledBy, className }: { labelledBy?: string; className?: string }) {
  const { mode } = useReaderPreferences()

  return (
    <ToggleGroup
      type="single"
      value={mode}
      onValueChange={(value) => value && setReaderPreference('mode', value as ReadingMode)}
      aria-labelledby={labelledBy}
      aria-label={labelledBy ? undefined : 'Reading layout'}
      className={className}
    >
      <ToggleGroupItem value="reading" size="sm">
        Reading
      </ToggleGroupItem>
      <ToggleGroupItem value="study" size="sm">
        Study
      </ToggleGroupItem>
    </ToggleGroup>
  )
}
