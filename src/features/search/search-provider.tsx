import { createContext, useContext, useEffect, useState } from 'react'

interface SearchDialogContextValue {
  open: boolean
  setOpen: (open: boolean) => void
}

const SearchDialogContext = createContext<SearchDialogContextValue | null>(null)

function isTypingTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  )
}

/**
 * Shares the search dialog's open state between its triggers (navigation,
 * home page, keyboard shortcut) and the dialog itself.
 */
export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  // Global shortcuts: ⌘K / Ctrl+K anywhere, "/" when not typing.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isModK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k'
      const isSlash = event.key === '/' && !isTypingTarget(event.target)
      if (isModK || isSlash) {
        event.preventDefault()
        setOpen((current) => (isModK ? !current : true))
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  return <SearchDialogContext value={{ open, setOpen }}>{children}</SearchDialogContext>
}

export function useSearchDialog() {
  const context = useContext(SearchDialogContext)
  if (!context) throw new Error('useSearchDialog must be used within SearchProvider')
  return context
}
