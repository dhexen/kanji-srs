// Helpers for displaying vocabulary images.
//
// Images are stored as Pexels `src.small` URLs (~130px tall), which look blurry
// and stretched when shown in a banner. Pexels URLs accept imgix-style query
// params, so we can request a larger square at render time without re-fetching.

/**
 * Upgrade a stored Pexels image URL to a higher-resolution square.
 * Non-Pexels URLs are returned unchanged.
 */
export function upgradeVocabImage(url: string | null | undefined, size = 400): string {
  if (!url) return ''
  if (!url.includes('images.pexels.com')) return url
  try {
    const u = new URL(url)
    u.searchParams.set('auto', 'compress')
    u.searchParams.set('cs', 'tinysrgb')
    u.searchParams.set('w', String(size))
    u.searchParams.set('h', String(size))
    u.searchParams.set('fit', 'crop')
    u.searchParams.set('dpr', '2')
    return u.toString()
  } catch {
    return url
  }
}
