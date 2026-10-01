import { toast } from 'sonner'

/** A library change that was not saved. `where` says which store refused it. */
export class LibrarySaveError extends Error {
  readonly where: 'account' | 'browser'

  constructor(where: 'account' | 'browser', options?: { cause?: unknown }) {
    super(
      where === 'account'
        ? 'This couldn’t be saved to your account. Check your connection and try again.'
        : 'This browser couldn’t save it. Its storage may be full or turned off. Try again, or sign in to keep it in your account.',
      options,
    )
    this.name = 'LibrarySaveError'
    this.where = where
  }
}

export const saveErrorMessage = (error: unknown) =>
  error instanceof LibrarySaveError ? error.message : 'Something went wrong while saving. Please try again.'

/** Runs a library change and reports a failure; the change itself already rolled back. */
export async function withSaveFeedback<T>(change: Promise<T>, success?: (result: T) => string | undefined) {
  try {
    const result = await change
    const message = success?.(result)
    if (message) toast.success(message)
    return result
  } catch (error) {
    toast.error(saveErrorMessage(error))
    return undefined
  }
}
