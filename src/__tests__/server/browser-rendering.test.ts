import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * `createServerFn(...).inputValidator(...).handler(fn)` is mocked to return `fn`
 * itself, so each module export *is* its handler and can be invoked directly as
 * `api.fetchContent({ data })`.
 *
 * This is deliberately keyed by export name. A previous version captured
 * handlers positionally into an array (`capturedHandlers[0..9]`), which meant
 * reordering the exports silently remapped every assertion onto the wrong
 * endpoint.
 */
vi.mock('@tanstack/react-start', () => ({
  createServerFn: (_opts?: any) => ({
    inputValidator: (_validatorFn: any) => ({
      handler: (fn: any) => fn,
    }),
  }),
}));

// The rate limiter reads the client IP from the request context, which only
// exists inside a real request.
vi.mock('@tanstack/react-start/server', () => ({
  getRequestHeader: () => '203.0.113.10',
}));

// `cloudflare:workers` is aliased to a stub in vitest.config.ts.
import {
  env,
  rateLimiters,
  resetWorkersEnv,
  reservations,
} from '../mocks/cloudflare-workers';

const api = await import('../../server/browser-rendering');

const BASE =
  'https://api.cloudflare.com/client/v4/accounts/test-account-id/browser-rendering';

/** Build a mock Response for a JSON Quick Action, wrapped in the API envelope. */
function jsonResponse(
  result: unknown,
  { browserMs, meta }: { browserMs?: string; meta?: unknown } = {},
) {
  const headers = new Map<string, string>();
  if (browserMs) headers.set('x-browser-ms-used', browserMs);
  return {
    ok: true,
    status: 200,
    headers,
    json: () => Promise.resolve({ success: true, result, meta }),
  };
}

function binaryResponse(bytes: Uint8Array, contentType = 'image/png') {
  const headers = new Map<string, string>([['content-type', contentType]]);
  return {
    ok: true,
    status: 200,
    headers,
    arrayBuffer: () => Promise.resolve(bytes.buffer),
  };
}

function bodyOf(call: any) {
  return JSON.parse(call[1].body);
}

describe('Browser Run server functions', () => {
  const mockFetch = vi.fn();
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = mockFetch as any;
    mockFetch.mockReset();
    resetWorkersEnv();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  // ─── Envelope unwrapping ──────────────────────────────────────────
  //
  // Every JSON Quick Action responds with `{ success, result, meta }`. Handing
  // that envelope to the UI verbatim was the original bug: /markdown rendered a
  // JSON blob with literal \n, and /snapshot rendered nothing at all.

  describe('envelope unwrapping', () => {
    it('fetchContent returns the HTML string, not the envelope', async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse('<html><body>Hello</body></html>', { browserMs: '800' }),
      );

      const result = await api.fetchContent({
        data: { url: 'https://example.com' },
      } as any);

      expect(result.html).toBe('<html><body>Hello</body></html>');
      expect(result.html).not.toContain('"success"');
      expect(result.browserMs).toBe(800);
    });

    it('fetchMarkdown returns the markdown string, not the envelope', async () => {
      const markdown = '# Example Domain\n\nThis domain is for use in docs.';
      mockFetch.mockResolvedValueOnce(jsonResponse(markdown));

      const result = await api.fetchMarkdown({
        data: { url: 'https://example.com' },
      } as any);

      expect(result.markdown).toBe(markdown);
      expect(result.markdown).not.toContain('"success"');
      // Real newlines, not the escaped \n that showed up in the raw envelope.
      expect(result.markdown).toContain('\n');
    });

    it('fetchLinks returns a flat array of URL strings', async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse(['https://a.example/', 'https://b.example/x']),
      );

      const result = await api.fetchLinks({
        data: { url: 'https://example.com' },
      } as any);

      expect(result.result).toEqual([
        'https://a.example/',
        'https://b.example/x',
      ]);
    });

    it('takeSnapshot surfaces both screenshot and html', async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          screenshot: 'iVBORw0KGgo=',
          content: '<html><body>Snap</body></html>',
        }),
      );

      const result = await api.takeSnapshot({
        data: { url: 'https://example.com' },
      } as any);

      expect(result.screenshot).toBe('data:image/png;base64,iVBORw0KGgo=');
      expect(result.html).toBe('<html><body>Snap</body></html>');
    });

    it('takeSnapshot returns nulls when the payload omits fields', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({}));

      const result = await api.takeSnapshot({
        data: { url: 'https://example.com' },
      } as any);

      expect(result.screenshot).toBeNull();
      expect(result.html).toBeNull();
    });

    it('scrapeContent returns the selector groups array', async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse([
          { selector: 'h1', results: [{ text: 'Example Domain' }] },
        ]),
      );

      const result = await api.scrapeContent({
        data: { url: 'https://example.com', elements: [{ selector: 'h1' }] },
      } as any);

      expect(result.result).toHaveLength(1);
      expect(result.result[0].selector).toBe('h1');
      expect(result.result[0].results[0].text).toBe('Example Domain');
    });

    it('startCrawl returns the job id string', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse('job-abc-123'));

      const result = await api.startCrawl({
        data: { url: 'https://example.com' },
      } as any);

      expect(result.jobId).toBe('job-abc-123');
    });

    it('throws when the API reports success: false', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map(),
        json: () =>
          Promise.resolve({
            success: false,
            result: null,
            errors: [{ message: 'Navigation timed out' }],
          }),
      });

      await expect(
        api.fetchMarkdown({ data: { url: 'https://example.com' } } as any),
      ).rejects.toThrow('Markdown fetch failed: Navigation timed out');
    });
  });

  // ─── Accessibility tree ───────────────────────────────────────────

  describe('fetchAccessibilityTree', () => {
    it('unwraps the tree and posts to the browser-rendering path', async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          accessibilityTree: {
            role: 'RootWebArea',
            name: 'Example Domain',
            children: [{ role: 'heading', name: 'Example Domain', level: 1 }],
          },
        }),
      );

      const result = await api.fetchAccessibilityTree({
        data: { url: 'https://example.com' },
      } as any);

      // The docs page prints /browser-run/accessibilityTree, but the OpenAPI
      // spec and every sibling endpoint use /browser-rendering/.
      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE}/accessibilityTree`,
        expect.objectContaining({ method: 'POST' }),
      );
      expect(result.tree?.role).toBe('RootWebArea');
      expect(result.tree?.children?.[0].level).toBe(1);
    });

    it('forwards interestingOnly and root', async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ accessibilityTree: null }),
      );

      await api.fetchAccessibilityTree({
        data: {
          url: 'https://example.com',
          interestingOnly: false,
          root: 'main',
        },
      } as any);

      const body = bodyOf(mockFetch.mock.calls[0]);
      expect(body.interestingOnly).toBe(false);
      expect(body.root).toBe('main');
    });

    it('returns null when a root selector matches nothing', async () => {
      // The API answers 200 with a null tree rather than erroring.
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ accessibilityTree: null }),
      );

      const result = await api.fetchAccessibilityTree({
        data: { url: 'https://example.com', root: '.nope' },
      } as any);

      expect(result.tree).toBeNull();
    });
  });

  // ─── Snapshot formats ─────────────────────────────────────────────

  describe('snapshot formats', () => {
    it('defaults to content + screenshot', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ content: '<html/>' }));

      await api.takeSnapshot({ data: { url: 'https://example.com' } } as any);

      expect(bodyOf(mockFetch.mock.calls[0]).formats).toEqual([
        'content',
        'screenshot',
      ]);
    });

    it('rejects a single format before calling the API', async () => {
      await expect(
        api.takeSnapshot({
          data: { url: 'https://example.com', formats: ['markdown'] },
        } as any),
      ).rejects.toThrow('needs at least two formats');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('drops unrecognised formats', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ markdown: '# x' }));

      await api.takeSnapshot({
        data: {
          url: 'https://example.com',
          formats: ['markdown', 'accessibilityTree', 'nonsense'],
        },
      } as any);

      expect(bodyOf(mockFetch.mock.calls[0]).formats).toEqual([
        'markdown',
        'accessibilityTree',
      ]);
    });

    it('surfaces markdown and the accessibility tree', async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          markdown: '# Example Domain',
          accessibilityTree: { role: 'RootWebArea', name: 'Example Domain' },
        }),
      );

      const result = await api.takeSnapshot({
        data: {
          url: 'https://example.com',
          formats: ['markdown', 'accessibilityTree'],
        },
      } as any);

      expect(result.markdown).toBe('# Example Domain');
      expect(result.accessibilityTree.role).toBe('RootWebArea');
      // Not requested, so absent.
      expect(result.screenshot).toBeNull();
      expect(result.html).toBeNull();
    });
  });

  // ─── JSON schema mode ─────────────────────────────────────────────

  describe('extractJson response_format', () => {
    it('sends the bare schema under json_schema', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ title: 'x' }));

      const schema = {
        type: 'object',
        properties: { title: { type: 'string' } },
      };

      await api.extractJson({
        data: {
          url: 'https://example.com',
          response_format: { type: 'json_schema', json_schema: schema },
        },
      } as any);

      const body = bodyOf(mockFetch.mock.calls[0]);
      expect(body.response_format).toEqual({
        type: 'json_schema',
        json_schema: schema,
      });
      // Not OpenAI's { name, schema, strict } wrapper.
      expect(body.response_format.json_schema.schema).toBeUndefined();
    });

    it('accepts a schema with no prompt', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ title: 'x' }));

      await expect(
        api.extractJson({
          data: {
            url: 'https://example.com',
            response_format: {
              type: 'json_schema',
              json_schema: { type: 'object' },
            },
          },
        } as any),
      ).resolves.toBeDefined();
    });
  });

  // ─── Binary endpoints ─────────────────────────────────────────────

  describe('binary endpoints', () => {
    it('takeScreenshot returns a data URL and byte count', async () => {
      mockFetch.mockResolvedValueOnce(
        binaryResponse(new Uint8Array([0x89, 0x50, 0x4e, 0x47])),
      );

      const result = await api.takeScreenshot({
        data: { url: 'https://example.com' },
      } as any);

      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE}/screenshot`,
        expect.objectContaining({ method: 'POST' }),
      );
      expect(result.image).toMatch(/^data:image\/png;base64,/);
      expect(result.bytes).toBe(4);
    });

    it('encodes payloads larger than one chunk without corruption', async () => {
      // 20,000 bytes exercises the 8 KB chunked encoder. The naive
      // per-byte reduce this replaced fell over on inputs this size.
      const size = 20_000;
      const bytes = new Uint8Array(size);
      for (let i = 0; i < size; i++) bytes[i] = i % 256;

      mockFetch.mockResolvedValueOnce(binaryResponse(bytes));

      const result = await api.takeScreenshot({
        data: { url: 'https://example.com' },
      } as any);

      const base64 = result.image.split(',')[1];
      const decoded = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

      expect(decoded).toHaveLength(size);
      expect(Array.from(decoded.slice(0, 4))).toEqual([0, 1, 2, 3]);
      expect(decoded[size - 1]).toBe((size - 1) % 256);
    });

    it('generatePdf forwards pdfOptions', async () => {
      mockFetch.mockResolvedValueOnce(
        binaryResponse(new Uint8Array(8), 'application/pdf'),
      );

      const result = await api.generatePdf({
        data: { url: 'https://example.com', pdfOptions: { format: 'A4' } },
      } as any);

      expect(bodyOf(mockFetch.mock.calls[0]).pdfOptions).toEqual({
        format: 'A4',
      });
      expect(result.pdf).toMatch(/^data:application\/pdf;base64,/);
    });

    it('rejects raw HTML before provider dispatch', async () => {
      await expect(
        api.generatePdf({
          data: { html: '<h1>Invoice</h1>', url: 'https://example.com' },
        } as any),
      ).rejects.toThrow('Raw HTML');
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  // ─── browserMs ────────────────────────────────────────────────────

  describe('browserMs', () => {
    it('rounds the float from the header to whole milliseconds', async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse('ok', { browserMs: '386.769775390625' }),
      );

      const result = await api.fetchMarkdown({
        data: { url: 'https://example.com' },
      } as any);

      expect(result.browserMs).toBe(387);
    });

    it('is null when the header is absent', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse('ok'));

      const result = await api.fetchMarkdown({
        data: { url: 'https://example.com' },
      } as any);

      expect(result.browserMs).toBeNull();
    });

    it('is null when the header is not a number', async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse('ok', { browserMs: 'not-a-number' }),
      );

      const result = await api.fetchMarkdown({
        data: { url: 'https://example.com' },
      } as any);

      expect(result.browserMs).toBeNull();
    });
  });

  // ─── URL validation ───────────────────────────────────────────────

  describe('URL validation', () => {
    const rejected: Array<[string, string]> = [
      ['no scheme', 'example.com'],
      ['file scheme', 'file:///etc/passwd'],
      ['javascript scheme', 'javascript:alert(1)'],
      ['loopback name', 'http://localhost:8080/'],
      ['loopback v4', 'http://127.0.0.1/'],
      ['private 10/8', 'http://10.0.0.5/'],
      ['private 192.168/16', 'http://192.168.1.1/'],
      ['private 172.16/12', 'http://172.20.10.1/'],
      ['cloud metadata', 'http://169.254.169.254/latest/meta-data/'],
      ['internal tld', 'http://db.internal/'],
      ['mdns tld', 'http://printer.local/'],
      ['loopback v6', 'http://[::1]/'],
    ];

    for (const [label, url] of rejected) {
      it(`rejects ${label} without calling the API`, async () => {
        await expect(
          api.fetchContent({ data: { url } } as any),
        ).rejects.toThrow();
        expect(mockFetch).not.toHaveBeenCalled();
      });
    }

    it('accepts a normal public https URL', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse('<html></html>'));

      await api.fetchContent({
        data: { url: 'https://example.com/page?q=1' },
      } as any);

      expect(bodyOf(mockFetch.mock.calls[0]).url).toBe(
        'https://example.com/page?q=1',
      );
    });

    it('rejects an empty selector list', async () => {
      await expect(
        api.scrapeContent({
          data: { url: 'https://example.com', elements: [] },
        } as any),
      ).rejects.toThrow('At least one CSS selector is required.');
    });

    it('requires a prompt or a schema for JSON extraction', async () => {
      await expect(
        api.extractJson({ data: { url: 'https://example.com' } } as any),
      ).rejects.toThrow('needs either a prompt or a response_format schema');
    });
  });

  // ─── Crawl clamping ───────────────────────────────────────────────

  describe('crawl option clamping', () => {
    it('clamps an absurd limit and depth to the demo ceilings', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse('job-1'));

      await api.startCrawl({
        data: { url: 'https://example.com', limit: 100_000, depth: 100_000 },
      } as any);

      const body = bodyOf(mockFetch.mock.calls[0]);
      expect(body.limit).toBe(10);
      expect(body.depth).toBe(2);
    });

    it('defaults render to false so no browser time is consumed', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse('job-1'));

      await api.startCrawl({ data: { url: 'https://example.com' } } as any);

      expect(bodyOf(mockFetch.mock.calls[0]).render).toBe(false);
    });

    it('omits ai-train from crawlPurposes', async () => {
      // The API default includes ai-train, and any site whose Content Signals
      // set ai-train=no rejects the whole job with a 400.
      mockFetch.mockResolvedValueOnce(jsonResponse('job-1'));

      await api.startCrawl({ data: { url: 'https://example.com' } } as any);

      const purposes = bodyOf(mockFetch.mock.calls[0]).crawlPurposes;
      expect(purposes).toEqual(['search', 'ai-input']);
      expect(purposes).not.toContain('ai-train');
    });

    it('drops unrecognised formats and falls back to markdown', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse('job-1'));

      await api.startCrawl({
        data: { url: 'https://example.com', formats: ['exe', 'wat'] },
      } as any);

      expect(bodyOf(mockFetch.mock.calls[0]).formats).toEqual(['markdown']);
    });

    it('keeps valid formats', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse('job-1'));

      await api.startCrawl({
        data: { url: 'https://example.com', formats: ['markdown', 'html'] },
      } as any);

      expect(bodyOf(mockFetch.mock.calls[0]).formats).toEqual([
        'markdown',
        'html',
      ]);
    });

    it('reports the clamped options back to the caller', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse('job-1'));

      const result = await api.startCrawl({
        data: { url: 'https://example.com', limit: 9999 },
      } as any);

      expect(result.appliedOptions.limit).toBe(10);
    });
  });

  // ─── Crawl status ─────────────────────────────────────────────────

  describe('getCrawlStatus', () => {
    beforeEach(() =>
      reservations.set('known', {
        kind: 'crawl',
        work: 5,
        complete: false,
        jobId: 'job-1',
      }),
    );
    it('unwraps the job and encodes the job id', async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          id: 'job-1',
          status: 'completed',
          total: 2,
          finished: 2,
          skipped: 0,
          browserSecondsUsed: 1.5,
          records: [
            {
              url: 'https://example.com/',
              status: 'completed',
              markdown: '# Hi',
              metadata: { url: 'https://example.com/', status: 200 },
            },
          ],
        }),
      );

      const result = await api.getCrawlStatus({
        data: { jobId: 'job-1' },
      } as any);

      expect(result.job.status).toBe('completed');
      expect(result.job.records).toHaveLength(1);
      expect(String(mockFetch.mock.calls[0][0])).toBe(`${BASE}/crawl/job-1`);
    });

    it('rejects a malformed job id without calling the API', async () => {
      await expect(
        api.getCrawlStatus({ data: { jobId: '../../admin' } } as any),
      ).rejects.toThrow('Invalid crawl job id.');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('passes through a known record status filter', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ records: [] }));

      await api.getCrawlStatus({
        data: { jobId: 'job-1', status: 'skipped' },
      } as any);

      expect(String(mockFetch.mock.calls[0][0])).toContain('status=skipped');
    });

    it('ignores an unknown status filter', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ records: [] }));

      await api.getCrawlStatus({
        data: { jobId: 'job-1', status: 'bogus' },
      } as any);

      expect(String(mockFetch.mock.calls[0][0])).not.toContain('status=');
    });
  });

  // ─── Rate limiting ────────────────────────────────────────────────

  describe('rate limiting', () => {
    it('retains capacity when a successful HTTP response lacks a valid provider envelope', async () => {
      mockFetch.mockResolvedValueOnce(
        Response.json({ unexpected: 'response' }),
      );
      await expect(
        api.fetchMarkdown({ data: { url: 'https://example.com' } } as any),
      ).rejects.toThrow('invalid envelope');
      expect([...reservations.values()].every((item) => !item.complete)).toBe(
        true,
      );
    });
    it.each(['QUICK_ACTION_LIMITER', 'PUBLIC_DEMO_BUDGET', 'BROWSER_BUDGET'])(
      'fails closed without %s',
      async (key) => {
        delete env[key];
        await expect(
          api.fetchMarkdown({ data: { url: 'https://example.com' } } as any),
        ).rejects.toThrow();
        expect(mockFetch).not.toHaveBeenCalled();
      },
    );

    it('retains ambiguous provider failures and blocks further paid work at shared capacity', async () => {
      mockFetch.mockRejectedValue(new Error('Lost provider response'));
      for (let i = 0; i < 2; i++)
        await expect(
          api.fetchMarkdown({ data: { url: 'https://example.com' } } as any),
        ).rejects.toThrow('Lost provider response');
      await expect(
        api.fetchMarkdown({ data: { url: 'https://example.com' } } as any),
      ).rejects.toThrow('Shared public demo allowance');
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect([...reservations.values()].every((item) => !item.complete)).toBe(
        true,
      );
    });

    it('rejects unknown crawl IDs before provider reads', async () => {
      await expect(
        api.getCrawlStatus({ data: { jobId: 'unknown-job' } } as any),
      ).rejects.toThrow('Unknown demo crawl');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('bounds prompts and raw action options before paid dispatch', async () => {
      await expect(
        api.extractJson({
          data: { url: 'https://example.com', prompt: 'x'.repeat(2001) },
        } as any),
      ).rejects.toThrow('Prompt exceeds');
      expect(reservations.size).toBe(0);
      expect(mockFetch).not.toHaveBeenCalled();
    });
    it('charges the quick action limiter, keyed on client IP', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse('ok'));

      await api.fetchMarkdown({ data: { url: 'https://example.com' } } as any);

      expect(rateLimiters.quickAction.calls).toEqual([
        { key: 'quickAction:203.0.113.10' },
      ]);
    });

    it('charges the separate crawl limiter', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse('job-1'));

      await api.startCrawl({ data: { url: 'https://example.com' } } as any);

      expect(rateLimiters.crawl.calls).toEqual([{ key: 'crawl:203.0.113.10' }]);
      expect(rateLimiters.quickAction.calls).toHaveLength(0);
    });

    it('blocks the request when over the limit', async () => {
      rateLimiters.quickAction.allow = false;

      await expect(
        api.fetchMarkdown({ data: { url: 'https://example.com' } } as any),
      ).rejects.toThrow('Rate limit reached');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('uses a distinct message for the crawl limiter', async () => {
      rateLimiters.crawl.allow = false;

      await expect(
        api.startCrawl({ data: { url: 'https://example.com' } } as any),
      ).rejects.toThrow('Crawl rate limit reached');
    });
  });

  // ─── Error handling ───────────────────────────────────────────────

  describe('error handling', () => {
    it('extracts the structured error message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        headers: new Map(),
        text: () =>
          Promise.resolve(
            JSON.stringify({
              success: false,
              errors: [{ message: 'Could not convert HTML', code: 2012 }],
            }),
          ),
      });

      await expect(
        api.fetchMarkdown({ data: { url: 'https://example.com' } } as any),
      ).rejects.toThrow('Markdown fetch failed (422): Could not convert HTML');
    });

    it('falls back to the raw body for non-JSON errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 502,
        headers: new Map(),
        text: () => Promise.resolve('Bad Gateway'),
      });

      await expect(
        api.fetchContent({ data: { url: 'https://example.com' } } as any),
      ).rejects.toThrow('Content fetch failed (502): Bad Gateway');
    });

    it('does not leak env key names when a secret is missing', async () => {
      // Regression guard: the old getEnvVar interpolated
      // Object.keys(process.env) into an error that reached the browser.
      env.CF_API_TOKEN = '';

      const error = await api
        .fetchContent({ data: { url: 'https://example.com' } } as any)
        .then(
          () => null,
          (e: Error) => e,
        );

      expect(error?.message).toMatch(/Server misconfigured: CF_API_TOKEN/);
      expect(error?.message).not.toMatch(/LIMITER/);
      expect(error?.message).not.toMatch(/CF_ACCOUNT_ID/);
    });
  });
});
