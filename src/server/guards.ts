/**
 * Request guards for the public demo.
 *
 * This app is deployed without authentication, so every server function is a
 * button that spends real Browser Run quota on the owner's account. Three
 * layers keep that bounded:
 *
 *   1. `assertPublicHttpUrl` — refuses anything that is not a public http(s)
 *      URL, so the demo cannot be used to probe loopback/private/link-local
 *      space from Cloudflare's edge.
 *   2. `enforceRateLimit` — the native Workers rate limiting binding, keyed on
 *      the client IP.
 *   3. `clampCrawlOptions` — hard server-side ceilings on the crawl parameters.
 *      This is the real spend control: the API accepts `limit` up to 100,000.
 */

import { getRequestHeader } from '@tanstack/react-start/server';
import { env } from 'cloudflare:workers';
import {
  CRAWL_CEILINGS,
  CRAWL_FORMATS,
  CRAWL_SOURCES,
} from '../shared/limits';

// ─── Errors ──────────────────────────────────────────────────────────

/** Thrown for input we reject before ever calling the Browser Run API. */
export class InvalidInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidInputError';
  }
}

/** Thrown when the caller has exceeded the demo's rate limit. */
export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}

// ─── URL validation ──────────────────────────────────────────────────

/**
 * Hostnames that are never a legitimate demo target. Exact matches only;
 * range-style blocks live in BLOCKED_HOST_PATTERNS below.
 */
const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  '0.0.0.0',
  'metadata.google.internal',
  'metadata.goog',
]);

/**
 * Loopback, RFC1918 private space, link-local (which covers the
 * 169.254.169.254 cloud metadata endpoint), and internal-only TLDs.
 */
const BLOCKED_HOST_PATTERNS: Array<RegExp> = [
  /^0\./,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(?:1[6-9]|2\d|3[01])\./,
  /^169\.254\./,
  /\.local$/i,
  /\.internal$/i,
  /\.localhost$/i,
  /^::1$/,
  /^f[cd][0-9a-f]{2}:/i, // fc00::/7 unique local address
  /^fe80:/i, // link-local
];

/**
 * Validate that `raw` is a public http(s) URL and return it normalised.
 *
 * @throws {InvalidInputError} if the value is unparseable, uses a non-http(s)
 *   scheme, or resolves to a hostname we refuse to target.
 */
export function assertPublicHttpUrl(raw: unknown, field = 'url'): string {
  if (typeof raw !== 'string' || raw.trim() === '') {
    throw new InvalidInputError(`${field} is required.`);
  }

  const candidate = raw.trim();

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new InvalidInputError(
      `${field} is not a valid URL. Include the scheme, for example https://example.com`
    );
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new InvalidInputError(
      `${field} must use http:// or https:// (received ${parsed.protocol}).`
    );
  }

  // URL normalises IPv6 hosts to bracketed form; strip for pattern matching.
  const hostname = parsed.hostname.replace(/^\[|\]$/g, '').toLowerCase();

  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw new InvalidInputError(
      `${field} points at a non-public host (${hostname}). This demo only renders public sites.`
    );
  }

  for (const pattern of BLOCKED_HOST_PATTERNS) {
    if (pattern.test(hostname)) {
      throw new InvalidInputError(
        `${field} points at a private or loopback address (${hostname}). This demo only renders public sites.`
      );
    }
  }

  return parsed.toString();
}

/** Validate a batch of CSS selectors coming from the scrape form. */
export function assertSelectors(
  elements: unknown
): Array<{ selector: string }> {
  if (!Array.isArray(elements) || elements.length === 0) {
    throw new InvalidInputError('At least one CSS selector is required.');
  }
  if (elements.length > 20) {
    throw new InvalidInputError('At most 20 selectors are allowed per request.');
  }

  return elements.map((element) => {
    const selector =
      typeof element === 'object' && element !== null
        ? (element as { selector?: unknown }).selector
        : undefined;

    if (typeof selector !== 'string' || selector.trim() === '') {
      throw new InvalidInputError('Each selector must be a non-empty string.');
    }
    if (selector.length > 200) {
      throw new InvalidInputError('Selectors must be under 200 characters.');
    }
    return { selector: selector.trim() };
  });
}

// ─── Rate limiting ───────────────────────────────────────────────────

/**
 * Which limiter to charge the request against. Crawl gets its own, much
 * tighter namespace because a single crawl job can render many pages.
 */
export type RateLimitKind = 'quickAction' | 'crawl';

interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

function getLimiter(kind: RateLimitKind): RateLimiter | undefined {
  const bindings = env as unknown as Record<string, RateLimiter | undefined>;
  return kind === 'crawl' ? bindings.CRAWL_LIMITER : bindings.QUICK_ACTION_LIMITER;
}

/**
 * Best-effort caller identity for rate limiting.
 *
 * Cloudflare's own docs caution against IP keys because mobile networks and
 * privacy proxies share addresses. For an unauthenticated public demo there is
 * no better signal available, so we accept the collateral-damage tradeoff and
 * keep the limits generous. The hard ceilings in `clampCrawlOptions` are what
 * actually bound spend.
 */
function clientKey(): string {
  const ip =
    getRequestHeader('cf-connecting-ip' as never) ??
    getRequestHeader('x-real-ip' as never) ??
    'unknown';
  return String(ip);
}

/**
 * Charge one token against the given limiter.
 *
 * Note that the Workers rate limiting binding is per-Cloudflare-location and
 * intentionally eventually consistent, so this bounds burst abuse rather than
 * providing exact global accounting.
 *
 * @throws {RateLimitError} when the caller is over the limit.
 */
export async function enforceRateLimit(kind: RateLimitKind): Promise<void> {
  const limiter = getLimiter(kind);

  // The binding is absent in unit tests and in older deployments. Treat a
  // missing limiter as "not configured" rather than failing the request.
  if (!limiter) return;

  const { success } = await limiter.limit({ key: `${kind}:${clientKey()}` });

  if (!success) {
    throw new RateLimitError(
      kind === 'crawl'
        ? 'Crawl rate limit reached for this demo. Crawls are limited to protect the shared account quota — try again in a minute.'
        : 'Rate limit reached for this demo. Try again in a few seconds.'
    );
  }
}

// ─── Crawl parameter ceilings ────────────────────────────────────────

export interface CrawlOptionsInput {
  limit?: number;
  depth?: number;
  formats?: Array<string>;
  render?: boolean;
  source?: string;
  jsonOptions?: { prompt?: string; response_format?: Record<string, any> };
  options?: {
    includeExternalLinks?: boolean;
    includeSubdomains?: boolean;
    includePatterns?: Array<string>;
    excludePatterns?: Array<string>;
  };
}

const ALLOWED_FORMATS = new Set<string>(CRAWL_FORMATS);
const ALLOWED_SOURCES = new Set<string>(CRAWL_SOURCES);

function clampInt(
  value: unknown,
  fallback: number,
  min: number,
  max: number
): number {
  const parsed =
    typeof value === 'number' && Number.isFinite(value)
      ? Math.floor(value)
      : fallback;
  return Math.min(Math.max(parsed, min), max);
}

/**
 * Build the crawl request body, clamping every caller-supplied value.
 *
 * Two defaults are deliberate:
 *
 * - `render` defaults to `false`. Non-rendered crawls run on Workers rather
 *   than a headless browser, are not billed during the beta, and consume no
 *   browser hours. This is the single largest cost control in the app.
 * - `crawlPurposes` omits `ai-train`. The API default includes it, and any site
 *   whose Content Signals set `ai-train=no` will reject the job outright with a
 *   400. Declaring only `search` and `ai-input` is both accurate for this demo
 *   and far less likely to be refused.
 */
export function clampCrawlOptions(
  input: CrawlOptionsInput
): Record<string, any> {
  const body: Record<string, any> = {
    limit: clampInt(
      input.limit,
      CRAWL_CEILINGS.defaultLimit,
      1,
      CRAWL_CEILINGS.maxLimit
    ),
    depth: clampInt(
      input.depth,
      CRAWL_CEILINGS.defaultDepth,
      1,
      CRAWL_CEILINGS.maxDepth
    ),
    render: input.render === true,
    crawlPurposes: ['search', 'ai-input'],
  };

  const formats = (input.formats ?? []).filter((format) =>
    ALLOWED_FORMATS.has(format)
  );
  body.formats = formats.length > 0 ? formats : ['markdown'];

  if (input.source && ALLOWED_SOURCES.has(input.source)) {
    body.source = input.source;
  }

  if ((body.formats as Array<string>).includes('json') && input.jsonOptions) {
    const prompt = input.jsonOptions.prompt?.trim();
    const jsonOptions: Record<string, any> = {};
    if (prompt) jsonOptions.prompt = prompt.slice(0, 2000);
    if (input.jsonOptions.response_format) {
      jsonOptions.response_format = input.jsonOptions.response_format;
    }
    if (Object.keys(jsonOptions).length > 0) body.jsonOptions = jsonOptions;
  }

  if (input.options) {
    const options: Record<string, any> = {};
    if (typeof input.options.includeExternalLinks === 'boolean') {
      options.includeExternalLinks = input.options.includeExternalLinks;
    }
    if (typeof input.options.includeSubdomains === 'boolean') {
      options.includeSubdomains = input.options.includeSubdomains;
    }
    // The API caps pattern arrays at 100 entries of 500 characters each.
    const patterns = (list: Array<string> | undefined) =>
      (list ?? [])
        .map((pattern) => pattern.trim())
        .filter(Boolean)
        .slice(0, 100)
        .map((pattern) => pattern.slice(0, 500));

    const include = patterns(input.options.includePatterns);
    const exclude = patterns(input.options.excludePatterns);
    if (include.length > 0) options.includePatterns = include;
    if (exclude.length > 0) options.excludePatterns = exclude;

    if (Object.keys(options).length > 0) body.options = options;
  }

  return body;
}
