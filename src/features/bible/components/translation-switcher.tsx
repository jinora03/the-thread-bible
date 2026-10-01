import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { setReaderPreference } from '@/hooks/reader-preferences'
import { useTranslation, useTranslations } from '@/hooks/use-scripture'

/** Choose the translation used everywhere Scripture appears. */
export function TranslationSwitcher() {
  const current = useTranslation()
  const { data: translations = [] } = useTranslations()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-1 px-2.5 text-[0.8125rem] font-semibold tracking-wide" aria-label={`Translation: ${current.name}. Change translation`}>
          {current.abbreviation}
          <ChevronDown aria-hidden="true" className="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Translation</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={current.id} onValueChange={(id) => setReaderPreference('translationId', id)}>
          {translations.map((translation) => (
            <DropdownMenuRadioItem key={translation.id} value={translation.id}>
              <span className="min-w-0">
                <span className="block font-medium">
                  {translation.name} <span className="font-normal text-muted-foreground">({translation.abbreviation})</span>
                </span>
                <span className="block text-xs text-muted-foreground">{translation.license}</span>
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
