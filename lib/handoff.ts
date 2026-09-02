const HANDOFF_KEY = 'submitnow:staged-urls'

/**
 * Moves a prepared URL list from a tool page to the submission form. Kept in
 * sessionStorage so the queue never leaves the browser and disappears when the
 * tab closes.
 */
export function stageUrlsForSubmission(urls: string[]): boolean {
  if (typeof window === 'undefined' || urls.length === 0) return false

  try {
    window.sessionStorage.setItem(HANDOFF_KEY, urls.join('\n'))
    return true
  } catch {
    return false
  }
}

/** Reads and clears the staged queue. */
export function consumeStagedUrls(): string | null {
  if (typeof window === 'undefined') return null

  try {
    const value = window.sessionStorage.getItem(HANDOFF_KEY)
    if (value) window.sessionStorage.removeItem(HANDOFF_KEY)
    return value || null
  } catch {
    return null
  }
}
