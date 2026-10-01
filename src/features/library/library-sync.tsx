import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import type { LibraryData } from '@shared/types/library'
import { queryClient } from '@/app/query-client'
import { localLibrary, localLibraryStore } from '@/features/library/local-library'
import { libraryQuery } from '@/features/library/use-library'
import { api } from '@/services/api-client'
import { useSession } from '@/services/auth-client'

/**
 * On sign-in, moves anything saved while signed out into the account, once.
 * Renders nothing; it only synchronises with the server.
 */
export function LibrarySync() {
  const { data: session } = useSession()
  const userId = session?.user.id
  const importedFor = useRef<string | null>(null)

  useEffect(() => {
    if (!userId) {
      // Signed out (or switched accounts): forget the previous account's data.
      queryClient.removeQueries({ queryKey: libraryQuery().queryKey })
      importedFor.current = null
      return
    }
    if (importedFor.current === userId) return
    importedFor.current = userId

    const local = localLibraryStore.getSnapshot()
    if (localLibrary.isEmpty(local)) return
    api
      .post<LibraryData>('/library/import', local)
      .then(async (merged) => {
        // A library request sent before the import could otherwise answer later and overwrite this.
        await queryClient.cancelQueries({ queryKey: libraryQuery().queryKey })
        queryClient.setQueryData(libraryQuery().queryKey, merged)
        localLibrary.clear()
        // A reading position alone moves over quietly.
        if (local.bookmarks.length > 0 || local.notes.length > 0) {
          toast.success('Passages and notes from this browser are now saved to your account')
        }
      })
      .catch(() => toast.error('Your saved passages from this browser couldn’t be moved to your account yet.'))
  }, [userId])

  return null
}
