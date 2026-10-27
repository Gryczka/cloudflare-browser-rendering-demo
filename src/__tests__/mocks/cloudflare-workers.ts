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

export const reservations = new Map<
  string,
  { work: number; kind: string; complete: boolean; jobId?: string }
>();
const budget = {
  async reserve(kind: string, work: number) {
    if ([...reservations.values()].filter((item) => !item.complete).length >= 2)
      throw new Error('Shared public demo allowance exhausted');
    const id = crypto.randomUUID();
    reservations.set(id, { kind, work, complete: false });
    return id;
  },
  async complete(id: string) {
    reservations.get(id)!.complete = true;
  },
  async attach(id: string, jobId: string) {
    reservations.get(id)!.jobId = jobId;
  },
  async known(jobId: string) {
    return [...reservations.values()].some((item) => item.jobId === jobId);
  },
  async terminal(jobId: string, status: string) {
    if (status === 'completed')
      for (const item of reservations.values())
        if (item.jobId === jobId) item.complete = true;
  },
};
export class DurableObject<T> {
  constructor(
    protected ctx: any,
    protected env: T,
  ) {}
}

function makeLimiter(bucket: {
  calls: Array<{ key: string }>;
  allow: boolean;
}) {
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
  PUBLIC_DEMO_BUDGET: JSON.stringify({
    maxActive: 2,
    jobsPerDay: 30,
    workPerDay: 100,
    requestTimeoutMs: 20000,
    crawlTimeoutMs: 300000,
  }),
  BROWSER_BUDGET: { getByName: () => budget },
};

/** Restore the default env and limiter state between tests. */
export function resetWorkersEnv() {
  reservations.clear();
  env.PUBLIC_DEMO_BUDGET = JSON.stringify({
    maxActive: 2,
    jobsPerDay: 30,
    workPerDay: 100,
    requestTimeoutMs: 20000,
    crawlTimeoutMs: 300000,
  });
  env.BROWSER_BUDGET = { getByName: () => budget };
  env.QUICK_ACTION_LIMITER = makeLimiter(rateLimiters.quickAction);
  env.CRAWL_LIMITER = makeLimiter(rateLimiters.crawl);
  env.CF_ACCOUNT_ID = 'test-account-id';
  env.CF_API_TOKEN = 'test-api-token';
  rateLimiters.quickAction.calls = [];
  rateLimiters.quickAction.allow = true;
  rateLimiters.crawl.calls = [];
  rateLimiters.crawl.allow = true;
}
