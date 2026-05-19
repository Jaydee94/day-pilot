/**
 * Backwards-compat re-export shim.
 *
 * Existing `.jsx` files import `from './api'` or `from '../api'`. The actual
 * typed implementation lives in `@/lib/api`. Once all pages are migrated to
 * `.tsx` (Tracks D–G), update their imports to `@/lib/api` and delete this file.
 */
export * from './lib/api'
