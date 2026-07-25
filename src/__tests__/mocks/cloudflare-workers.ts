/**
 * Test stub for the virtual `cloudflare:workers` module.
 *
 * `cloudflare:workers` only exists inside the Workers runtime, so Vite cannot
 * resolve it under Vitest. `vitest.config.ts` aliases the specifier to this
 * file, which lets both the code under test and the tests themselves import it
 * normally.
 *
 * `env` is intentionally mutable so tests can simulate a missing secret.
 */

export const rateLimiters = {
  quickAction: { calls: [] as Array<{ key: string }>, allow: true },
  crawl: { calls: [] as Array<{ key: string }>, allow: true },
};

function makeLimiter(bucket: { calls: Array<{ key: string }>; allow: boolean }) {
  return {
    async limit(options: { key: string }) {
      bucket.calls.push(options);
      return { success: bucket.allow };
    },
  };
}

export const env: Record<string, any> = {
  CF_ACCOUNT_ID: 'test-account-id',
  CF_API_TOKEN: 'test-api-token',
  QUICK_ACTION_LIMITER: makeLimiter(rateLimiters.quickAction),
  CRAWL_LIMITER: makeLimiter(rateLimiters.crawl),
};

/** Restore the default env and limiter state between tests. */
export function resetWorkersEnv() {
  env.CF_ACCOUNT_ID = 'test-account-id';
  env.CF_API_TOKEN = 'test-api-token';
  rateLimiters.quickAction.calls = [];
  rateLimiters.quickAction.allow = true;
  rateLimiters.crawl.calls = [];
  rateLimiters.crawl.allow = true;
}
