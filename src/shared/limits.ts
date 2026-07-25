/**
 * Demo limits shared between the browser and the Worker.
 *
 * This module must stay isomorphic — no `cloudflare:workers` import, no
 * server-only dependencies — because the crawl form imports it to label its
 * inputs. Enforcement lives in `src/server/guards.ts`; this file only declares
 * the numbers so the UI and the server cannot drift apart.
 */

/**
 * Hard ceilings applied to every crawl request, regardless of what the UI sends.
 *
 * The Browser Run API itself allows `limit` up to 100,000 and `depth` up to
 * 100,000. Those are wildly inappropriate for an unauthenticated public demo
 * spending a shared account's quota, so the server clamps to these values.
 */
export const CRAWL_CEILINGS = {
  maxLimit: 100,
  defaultLimit: 25,
  maxDepth: 5,
  defaultDepth: 2,
} as const;

/** Formats the `/crawl` endpoint accepts. */
export const CRAWL_FORMATS = ['html', 'markdown', 'json'] as const;

/** Values accepted by the `/crawl` `source` parameter. */
export const CRAWL_SOURCES = ['all', 'sitemaps', 'links'] as const;
