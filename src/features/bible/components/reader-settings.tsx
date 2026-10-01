import { Type } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ReadingModeToggle } from '@/features/bible/components/reading-mode-toggle'
import { setReaderPreference, useReaderPreferences, type TextSize } from '@/hooks/reader-preferences'

const textSizes: { value: TextSize; label: string; sample: string }[] = [
  { value: 'sm', label: 'Small text', sample: 'text-xs' },
  { value: 'md', label: 'Default text size', sample: 'text-sm' },
  { value: 'lg', label: 'Large text', sample: 'text-base' },
  { value: 'xl', label: 'Extra large text', sample: 'text-lg' },
]

/** Display settings. Reading mode lives here on small screens; the toolbar shows it on larger ones. */
export function ReaderSettings() {
  const { textSize } = useReaderPreferences()

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Display settings">
              <Type />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Display settings</TooltipContent>
      </Tooltip>
      <PopoverContent align="end" className="w-64 space-y-5 p-4">
        <div className="md:hidden">
          <p id="reader-mode-label" className="eyebrow mb-2">
            Layout
          </p>
          <ReadingModeToggle labelledBy="reader-mode-label" />
        </div>
        <div>
          <p id="text-size-label" className="eyebrow mb-2">
            Text size
          </p>
          <ToggleGroup
            type="single"
            value={textSize}
            onValueChange={(value) => value && setReaderPreference('textSize', value as TextSize)}
            aria-labelledby="text-size-label"
            className="w-full"
          >
            {textSizes.map((size) => (
              <ToggleGroupItem key={size.value} value={size.value} aria-label={size.label} className="flex-1 font-serif">
                <span className={size.sample} aria-hidden="true">
                  A
                </span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </PopoverContent>
    </Popover>
  )
}
