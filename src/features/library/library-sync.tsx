import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { queryClient } from '@/app/query-client'
import { localLibrary, useLocalLibrary } from '@/features/library/local-library'
import { importLocalLibrary } from '@/features/library/use-library'
import { useSession } from '@/services/auth-client'

/**
 * While a reader is signed in, moves anything saved in this browser into
 * their account: on sign-in, and again if more is saved here meanwhile
 * (another tab, or the moment before the session was known). A failed
 * import keeps everything in the browser and offers to try again.
 * Renders nothing.
 */
export function LibrarySync() {
  const { data: session } = useSession()
  const userId = session?.user.id
  const local = useLocalLibrary()

  // Read at response time, so a late reply for one account never lands in another's view.
  const currentUser = useRef(userId)
  useEffect(() => {
    currentUser.current = userId
  }, [userId])
  const running = useRef(false)
  const [failedFor, setFailedFor] = useState<string | null>(null)
  const [finished, setFinished] = useState(0)

  // Whenever the account changes (or the reader signs out), forget every other account's cached library.
  useEffect(() => {
    queryClient.removeQueries({ queryKey: ['library'], predicate: (query) => query.queryKey[1] !== userId })
  }, [userId])

  useEffect(() => {
    if (!userId || running.current || failedFor === userId || localLibrary.isEmpty(local)) return
    running.current = true
    const movesPassagesOrNotes = local.bookmarks.length > 0 || local.notes.length > 0

    importLocalLibrary(userId, () => currentUser.current === userId)
      .then(() => {
        if (movesPassagesOrNotes) toast.success('Passages and notes from this browser are now saved to your account')
      })
      .catch(() => {
        // Nothing was removed from the browser; pause until the reader asks to retry (or reloads).
        setFailedFor(userId)
        toast.error('Your saved passages from this browser couldn’t be moved to your account yet. They are still saved here.', {
          duration: 15_000,
          action: { label: 'Try again', onClick: () => setFailedFor(null) },
        })
      })
      .finally(() => {
        running.current = false
        // Run again: anything saved during the import is moved next.
        setFinished((count) => count + 1)
      })
  }, [userId, local, failedFor, finished])

  return null
}
