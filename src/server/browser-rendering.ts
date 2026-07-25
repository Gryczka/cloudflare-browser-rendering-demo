/**
 * Server functions wrapping the Cloudflare Browser Run REST API (Quick Actions).
 *
 * These run on the Worker, inject the API token, and return typed payloads to
 * the browser. The token never reaches the client.
 *
 * The one non-obvious thing in here is `callQuickAction`. Every JSON Quick
 * Action wraps its payload in a `{ success, result, meta }` envelope, so the
 * useful data is always at `.result`. Returning the envelope verbatim is the
 * mistake this module exists to avoid — it surfaces in the UI as a JSON blob
 * with escaped quotes instead of the markdown/HTML/array the page expects.
 *
 * `/screenshot` and `/pdf` are the exceptions: they return raw bytes, not an
 * envelope, and are handled by `callBinaryAction`.
 */

import { createServerFn } from '@tanstack/react-start';
import { env } from 'cloudflare:workers';
import {
  assertPublicHttpUrl,
  assertSelectors,
  clampCrawlOptions,
  enforceRateLimit,
  type CrawlOptionsInput,
} from './guards';

// ─── Configuration ───────────────────────────────────────────────────

function getEnvVar(name: 'CF_ACCOUNT_ID' | 'CF_API_TOKEN'): string {
  const value = (env as unknown as Record<string, unknown>)[name];

  if (typeof value !== 'string' || value === '') {
    // Deliberately does not enumerate the available env keys. Server function
    // errors are surfaced to the browser, and listing the Worker's binding
    // names to anonymous visitors is needless disclosure.
    throw new Error(
      `Server misconfigured: ${name} is not set. ` +
        `Set it locally in .dev.vars, or in production with \`wrangler secret put ${name}\`.`
    );
  }

  return value;
}

function getBaseUrl(): string {
  return `https://api.cloudflare.com/client/v4/accounts/${getEnvVar(
    'CF_ACCOUNT_ID'
  )}/browser-rendering`;
}

function getHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${getEnvVar('CF_API_TOKEN')}`,
    'Content-Type': 'application/json',
  };
}

// ─── Shared response handling ────────────────────────────────────────

/** The envelope every JSON Quick Action responds with. */
interface Envelope<T> {
  success: boolean;
  result: T;
  errors?: Array<{ message: string; code?: number; detail?: string }>;
  meta?: { status?: number; title?: string };
}

/** What every server function in this module returns. */
export interface QuickActionResult<T> {
  result: T;
  /** Browser time attributed to this request, rounded to whole milliseconds. */
  browserMs: number | null;
  /** Present on endpoints that report it — `status` and page `title`. */
  meta?: { status?: number; title?: string };
}

/**
 * Read `X-Browser-Ms-Used` and round it.
 *
 * The header carries full float precision (e.g. `386.769775390625`), which is
 * noise in a UI. Rounding here keeps every call site honest.
 */
function readBrowserMs(response: Response): number | null {
  const raw = response.headers.get('x-browser-ms-used');
  if (!raw) return null;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

/** Turn a non-2xx Browser Run response into a readable Error. */
async function toApiError(response: Response, label: string): Promise<Error> {
  const body = await response.text();

  // Prefer the structured error message when the API gives us one.
  try {
    const parsed = JSON.parse(body) as Envelope<unknown>;
    const message = parsed.errors?.map((error) => error.message).join('; ');
    if (message) {
      return new Error(`${label} failed (${response.status}): ${message}`);
    }
  } catch {
    // Not JSON — fall through to the raw body.
  }

  return new Error(
    `${label} failed (${response.status}): ${body.slice(0, 500)}`
  );
}

/**
 * POST a JSON Quick Action and return the unwrapped `result`.
 */
async function callQuickAction<T>(
  path: string,
  body: Record<string, unknown>,
  label: string
): Promise<QuickActionResult<T>> {
  const response = await fetch(`${getBaseUrl()}${path}`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) throw await toApiError(response, label);

  const envelope = (await response.json()) as Envelope<T>;

  if (envelope.success === false) {
    const message =
      envelope.errors?.map((error) => error.message).join('; ') ??
      'unknown error';
    throw new Error(`${label} failed: ${message}`);
  }

  return {
    result: envelope.result,
    browserMs: readBrowserMs(response),
    meta: envelope.meta,
  };
}

/**
 * POST a binary Quick Action (`/screenshot`, `/pdf`) and return a data URL.
 *
 * Encodes in 8 KB chunks. The obvious one-liner —
 * `bytes.reduce((s, b) => s + String.fromCharCode(b), '')` — allocates a new
 * string per byte and falls over on full-page screenshots.
 */
async function callBinaryAction(
  path: string,
  body: Record<string, unknown>,
  label: string,
  fallbackMime: string
): Promise<{ dataUrl: string; bytes: number; browserMs: number | null }> {
  const response = await fetch(`${getBaseUrl()}${path}`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) throw await toApiError(response, label);

  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  const CHUNK = 8192;
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + CHUNK));
  }

  const mime = response.headers.get('content-type') || fallbackMime;

  return {
    dataUrl: `data:${mime};base64,${btoa(binary)}`,
    bytes: bytes.length,
    browserMs: readBrowserMs(response),
  };
}

// ─── Screenshot ──────────────────────────────────────────────────────

export const takeScreenshot = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      url?: string;
      html?: string;
      screenshotOptions?: {
        type?: 'png' | 'webp' | 'jpeg';
        fullPage?: boolean;
        omitBackground?: boolean;
      };
      viewport?: { width?: number; height?: number };
    }) => data
  )
  .handler(async ({ data }) => {
    await enforceRateLimit('quickAction');

    const body: Record<string, unknown> = {};
    if (data.html) {
      body.html = data.html;
    } else {
      body.url = assertPublicHttpUrl(data.url);
    }
    if (data.screenshotOptions) body.screenshotOptions = data.screenshotOptions;
    if (data.viewport) body.viewport = data.viewport;

    const { dataUrl, bytes, browserMs } = await callBinaryAction(
      '/screenshot',
      body,
      'Screenshot',
      'image/png'
    );

    return { image: dataUrl, bytes, browserMs };
  });

// ─── PDF ─────────────────────────────────────────────────────────────

export const generatePdf = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      url?: string;
      html?: string;
      pdfOptions?: {
        format?: string;
        landscape?: boolean;
        printBackground?: boolean;
      };
    }) => data
  )
  .handler(async ({ data }) => {
    await enforceRateLimit('quickAction');

    const body: Record<string, unknown> = {};
    if (data.html) {
      body.html = data.html;
    } else {
      body.url = assertPublicHttpUrl(data.url);
    }
    if (data.pdfOptions) body.pdfOptions = data.pdfOptions;

    const { dataUrl, bytes, browserMs } = await callBinaryAction(
      '/pdf',
      body,
      'PDF generation',
      'application/pdf'
    );

    return { pdf: dataUrl, bytes, browserMs };
  });

// ─── Content (rendered HTML) ─────────────────────────────────────────

export const fetchContent = createServerFn({ method: 'POST' })
  .inputValidator((data: { url: string }) => data)
  .handler(async ({ data }) => {
    await enforceRateLimit('quickAction');

    const { result, browserMs, meta } = await callQuickAction<string>(
      '/content',
      { url: assertPublicHttpUrl(data.url) },
      'Content fetch'
    );

    return { html: result, browserMs, meta };
  });

// ─── Markdown ────────────────────────────────────────────────────────

export const fetchMarkdown = createServerFn({ method: 'POST' })
  .inputValidator((data: { url: string }) => data)
  .handler(async ({ data }) => {
    await enforceRateLimit('quickAction');

    const { result, browserMs, meta } = await callQuickAction<string>(
      '/markdown',
      { url: assertPublicHttpUrl(data.url) },
      'Markdown fetch'
    );

    return { markdown: result, browserMs, meta };
  });

// ─── Scrape ──────────────────────────────────────────────────────────

/** One matched element, as returned inside a scrape group. */
export interface ScrapeMatch {
  text?: string;
  html?: string;
  attributes?: Array<{ name: string; value: string }>;
  height?: number;
  width?: number;
  top?: number;
  left?: number;
}

/** `/scrape` returns one group per requested selector. */
export interface ScrapeGroup {
  selector: string;
  results: Array<ScrapeMatch>;
}

export const scrapeContent = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: { url: string; elements: Array<{ selector: string }> }) => data
  )
  .handler(async ({ data }) => {
    await enforceRateLimit('quickAction');

    return callQuickAction<Array<ScrapeGroup>>(
      '/scrape',
      {
        url: assertPublicHttpUrl(data.url),
        elements: assertSelectors(data.elements),
      },
      'Scrape'
    );
  });

// ─── JSON (AI extraction) ────────────────────────────────────────────

export const extractJson = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      url: string;
      prompt?: string;
      /**
       * JSON Schema mode. Note the shape is `{ type, json_schema }` where
       * `json_schema` is the bare schema — not OpenAI's
       * `{ name, schema, strict }` wrapper.
       */
      response_format?: {
        type: string;
        json_schema: Record<string, any>;
      };
    }) => data
  )
  .handler(async ({ data }) => {
    await enforceRateLimit('quickAction');

    const body: Record<string, unknown> = {
      url: assertPublicHttpUrl(data.url),
    };
    if (data.prompt) body.prompt = data.prompt;
    if (data.response_format) body.response_format = data.response_format;

    if (!data.prompt && !data.response_format) {
      throw new Error(
        'JSON extraction needs either a prompt or a response_format schema.'
      );
    }

    return callQuickAction<Record<string, any>>(
      '/json',
      body,
      'JSON extraction'
    );
  });

// ─── Links ───────────────────────────────────────────────────────────

export const fetchLinks = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: { url: string; visibleLinksOnly?: boolean }) => data
  )
  .handler(async ({ data }) => {
    await enforceRateLimit('quickAction');

    const body: Record<string, unknown> = {
      url: assertPublicHttpUrl(data.url),
    };
    if (typeof data.visibleLinksOnly === 'boolean') {
      body.visibleLinksOnly = data.visibleLinksOnly;
    }

    // `/links` returns a flat array of absolute URL strings.
    return callQuickAction<Array<string>>('/links', body, 'Links fetch');
  });

// ─── Snapshot ────────────────────────────────────────────────────────

interface SnapshotPayload {
  content?: string;
  screenshot?: string;
  markdown?: string;
  accessibilityTree?: any;
}

export const takeSnapshot = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      url: string;
      screenshotOptions?: { type?: 'png' | 'webp' | 'jpeg' };
    }) => data
  )
  .handler(async ({ data }) => {
    await enforceRateLimit('quickAction');

    const body: Record<string, unknown> = {
      url: assertPublicHttpUrl(data.url),
    };
    if (data.screenshotOptions) body.screenshotOptions = data.screenshotOptions;

    const { result, browserMs, meta } = await callQuickAction<SnapshotPayload>(
      '/snapshot',
      body,
      'Snapshot'
    );

    return {
      // `/snapshot` always base64-encodes the screenshot, regardless of the
      // `encoding` option available on the standalone endpoint.
      screenshot: result.screenshot
        ? `data:image/png;base64,${result.screenshot}`
        : null,
      html: result.content ?? null,
      browserMs,
      meta,
    };
  });

// ─── Crawl (start) ───────────────────────────────────────────────────

export const startCrawl = createServerFn({ method: 'POST' })
  .inputValidator((data: { url: string } & CrawlOptionsInput) => data)
  .handler(async ({ data }) => {
    await enforceRateLimit('crawl');

    const body = clampCrawlOptions(data);
    body.url = assertPublicHttpUrl(data.url);

    // A successful start returns the job id as a bare string in `result`.
    const { result, browserMs } = await callQuickAction<string>(
      '/crawl',
      body,
      'Crawl start'
    );

    return { jobId: result, browserMs, appliedOptions: body };
  });

// ─── Crawl (status / results) ────────────────────────────────────────

export interface CrawlRecord {
  url: string;
  status: string;
  html?: string;
  markdown?: string;
  json?: any;
  metadata: { url: string; status: number; title?: string };
}

export interface CrawlJob {
  id: string;
  status: string;
  browserSecondsUsed: number;
  total: number;
  finished: number;
  skipped: number;
  records: Array<CrawlRecord>;
  /** Present when the response was truncated at 10 MB. */
  cursor?: string | number;
}

const CRAWL_RECORD_STATUSES = new Set([
  'queued',
  'errored',
  'completed',
  'disallowed',
  'skipped',
  'cancelled',
]);

export const getCrawlStatus = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: { jobId: string; status?: string; cursor?: number; limit?: number }) =>
      data
  )
  .handler(async ({ data }) => {
    // Job ids are API-generated UUIDs. Encode rather than interpolating raw,
    // and reject anything that is not shaped like one.
    if (!/^[a-zA-Z0-9-]{1,64}$/.test(data.jobId ?? '')) {
      throw new Error('Invalid crawl job id.');
    }

    const url = new URL(`${getBaseUrl()}/crawl/${encodeURIComponent(data.jobId)}`);

    if (data.status && CRAWL_RECORD_STATUSES.has(data.status)) {
      url.searchParams.set('status', data.status);
    }
    if (typeof data.cursor === 'number' && Number.isFinite(data.cursor)) {
      url.searchParams.set('cursor', String(Math.max(0, data.cursor)));
    }
    if (typeof data.limit === 'number' && Number.isFinite(data.limit)) {
      url.searchParams.set(
        'limit',
        String(Math.min(Math.max(1, Math.floor(data.limit)), 100))
      );
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${getEnvVar('CF_API_TOKEN')}` },
    });

    if (!response.ok) throw await toApiError(response, 'Crawl status check');

    const envelope = (await response.json()) as Envelope<CrawlJob>;

    return {
      job: envelope.result,
      browserMs: readBrowserMs(response),
    };
  });
