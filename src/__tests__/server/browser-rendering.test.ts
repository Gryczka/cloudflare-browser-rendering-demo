import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We test the server function handler logic by mocking createServerFn
// to capture and expose the handler functions for direct invocation.

type HandlerFn = (ctx: { data: any }) => Promise<any>;
const capturedHandlers: HandlerFn[] = [];

vi.mock('@tanstack/react-start', () => ({
  createServerFn: (_opts?: any) => ({
    inputValidator: (_validatorFn: any) => ({
      handler: (fn: HandlerFn) => {
        capturedHandlers.push(fn);
        return fn;
      },
    }),
  }),
}));

// Stub process.env for the module
vi.stubGlobal('process', {
  env: {
    CF_ACCOUNT_ID: 'test-account-id',
    CF_API_TOKEN: 'test-api-token',
  },
});

// Import after mocks are set up - this triggers all createServerFn calls
// The handlers are captured in order of declaration in the source file:
// 0: takeScreenshot, 1: generatePdf, 2: fetchContent, 3: fetchMarkdown,
// 4: scrapeContent, 5: extractJson, 6: fetchLinks, 7: takeSnapshot,
// 8: startCrawl, 9: getCrawlStatus
await import('../../server/browser-rendering');

const handlerMap: Record<string, HandlerFn> = {
  takeScreenshot: capturedHandlers[0],
  generatePdf: capturedHandlers[1],
  fetchContent: capturedHandlers[2],
  fetchMarkdown: capturedHandlers[3],
  scrapeContent: capturedHandlers[4],
  extractJson: capturedHandlers[5],
  fetchLinks: capturedHandlers[6],
  takeSnapshot: capturedHandlers[7],
  startCrawl: capturedHandlers[8],
  getCrawlStatus: capturedHandlers[9],
};

function call(name: string, data: any) {
  return handlerMap[name]({ data });
}

describe('Browser Rendering Server Functions', () => {
  const mockFetch = vi.fn();
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = mockFetch;
    mockFetch.mockReset();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('captures all 10 handlers', () => {
    expect(capturedHandlers).toHaveLength(10);
    Object.values(handlerMap).forEach((h) => expect(h).toBeTypeOf('function'));
  });

  // ─── takeScreenshot ──────────────────────────────────────────────

  describe('takeScreenshot', () => {
    it('calls the screenshot endpoint with correct URL and returns base64 image', async () => {
      const mockBuf = new Uint8Array([0x89, 0x50, 0x4e, 0x47]).buffer;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(mockBuf),
        headers: new Map([
          ['content-type', 'image/png'],
          ['x-browser-ms-used', '1500'],
        ]),
      });

      const result = await call('takeScreenshot', { url: 'https://example.com' });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.cloudflare.com/client/v4/accounts/test-account-id/browser-rendering/screenshot',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ url: 'https://example.com' }),
        })
      );
      expect(result.image).toMatch(/^data:image\/png;base64,/);
    });

    it('forwards screenshotOptions and viewport', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(4)),
        headers: new Map([['content-type', 'image/webp']]),
      });

      await call('takeScreenshot', {
        url: 'https://example.com',
        screenshotOptions: { type: 'webp', fullPage: true },
        viewport: { width: 1920, height: 1080 },
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.screenshotOptions).toEqual({ type: 'webp', fullPage: true });
      expect(body.viewport).toEqual({ width: 1920, height: 1080 });
    });

    it('throws on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: () => Promise.resolve('Forbidden'),
      });

      await expect(call('takeScreenshot', { url: 'https://x.com' })).rejects.toThrow(
        'Screenshot failed (403): Forbidden'
      );
    });
  });

  // ─── generatePdf ────────────────────────────────────────────────

  describe('generatePdf', () => {
    it('returns base64 PDF data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
        headers: new Map([['x-browser-ms-used', '2000']]),
      });

      const result = await call('generatePdf', {
        url: 'https://example.com',
        pdfOptions: { format: 'A4' },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/pdf'),
        expect.objectContaining({ method: 'POST' })
      );
      expect(result.pdf).toMatch(/^data:application\/pdf;base64,/);
    });
  });

  // ─── fetchContent ───────────────────────────────────────────────

  describe('fetchContent', () => {
    it('returns rendered HTML string', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('<html><body>Hello</body></html>'),
        headers: new Map([['x-browser-ms-used', '800']]),
      });

      const result = await call('fetchContent', { url: 'https://example.com' });
      expect(result.html).toBe('<html><body>Hello</body></html>');
    });

    it('throws on error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
      });

      await expect(call('fetchContent', { url: 'https://x.com' })).rejects.toThrow(
        'Content fetch failed (500)'
      );
    });
  });

  // ─── fetchMarkdown ──────────────────────────────────────────────

  describe('fetchMarkdown', () => {
    it('returns markdown text', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('# Hello\n\nWorld'),
        headers: new Map(),
      });

      const result = await call('fetchMarkdown', { url: 'https://example.com' });
      expect(result.markdown).toBe('# Hello\n\nWorld');
    });
  });

  // ─── scrapeContent ──────────────────────────────────────────────

  describe('scrapeContent', () => {
    it('sends selectors and returns structured result', async () => {
      const mockResult = { results: [{ selector: 'h1', results: [{ text: 'Title' }] }] };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResult),
        headers: new Map(),
      });

      const result = await call('scrapeContent', {
        url: 'https://example.com',
        elements: [{ selector: 'h1' }],
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.elements).toEqual([{ selector: 'h1' }]);
      expect(result.result).toEqual(mockResult);
    });
  });

  // ─── extractJson ────────────────────────────────────────────────

  describe('extractJson', () => {
    it('sends prompt and returns AI-extracted JSON', async () => {
      const mockResult = { heading: 'Example', links: [] };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResult),
        headers: new Map(),
      });

      const result = await call('extractJson', {
        url: 'https://example.com',
        prompt: 'Extract heading',
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.prompt).toBe('Extract heading');
      expect(result.result).toEqual(mockResult);
    });

    it('sends response_format when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
        headers: new Map(),
      });

      await call('extractJson', {
        url: 'https://example.com',
        response_format: {
          type: 'json_schema',
          schema: { type: 'object', properties: { title: { type: 'string' } } },
        },
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.response_format.type).toBe('json_schema');
    });
  });

  // ─── fetchLinks ─────────────────────────────────────────────────

  describe('fetchLinks', () => {
    it('returns links from page', async () => {
      const mockResult = { links: [{ href: '/page', text: 'Page' }] };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResult),
        headers: new Map(),
      });

      const result = await call('fetchLinks', { url: 'https://example.com' });
      expect(result.result.links).toHaveLength(1);
    });
  });

  // ─── takeSnapshot ──────────────────────────────────────────────

  describe('takeSnapshot', () => {
    it('returns both screenshot and HTML', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ screenshot: 'aGVsbG8=', content: '<html/>' }),
        headers: new Map(),
      });

      const result = await call('takeSnapshot', { url: 'https://example.com' });
      expect(result.screenshot).toMatch(/^data:image\/png;base64,/);
      expect(result.html).toBe('<html/>');
    });

    it('returns null screenshot when not present', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ content: '<html/>' }),
        headers: new Map(),
      });

      const result = await call('takeSnapshot', { url: 'https://example.com' });
      expect(result.screenshot).toBeNull();
    });
  });

  // ─── startCrawl ─────────────────────────────────────────────────

  describe('startCrawl', () => {
    it('sends full crawl configuration', async () => {
      // The real crawl API returns { success: true, result: "job-id-string" }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, result: 'job-123' }),
        headers: new Map(),
      });

      const result = await call('startCrawl', {
        url: 'https://example.com',
        limit: 50,
        depth: 3,
        formats: ['markdown'],
        render: false,
        source: 'sitemaps',
        options: { includePatterns: ['**/docs/*'] },
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.url).toBe('https://example.com');
      expect(body.limit).toBe(50);
      expect(body.depth).toBe(3);
      expect(body.formats).toEqual(['markdown']);
      expect(body.render).toBe(false);
      expect(body.source).toBe('sitemaps');
      expect(body.options.includePatterns).toEqual(['**/docs/*']);
      expect(result.result.result).toBe('job-123');
    });

    it('sends only url when no optional params', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, result: 'job-456' }),
        headers: new Map(),
      });

      await call('startCrawl', { url: 'https://example.com' });
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body).toEqual({ url: 'https://example.com' });
    });
  });

  // ─── getCrawlStatus ─────────────────────────────────────────────

  describe('getCrawlStatus', () => {
    it('GETs crawl job status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ result: { status: 'complete', records: [] } }),
        headers: new Map(),
      });

      await call('getCrawlStatus', { jobId: 'job-123' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/crawl/job-123'),
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('appends ?status=skipped when filter provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ result: { records: [] } }),
        headers: new Map(),
      });

      await call('getCrawlStatus', { jobId: 'job-123', status: 'skipped' });

      expect(mockFetch.mock.calls[0][0]).toContain('?status=skipped');
    });

    it('throws on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () => Promise.resolve('Not found'),
      });

      await expect(call('getCrawlStatus', { jobId: 'bad' })).rejects.toThrow(
        'Crawl status check failed (404): Not found'
      );
    });
  });

  // ─── Cross-cutting concerns ─────────────────────────────────────

  describe('API URL and headers', () => {
    it('constructs correct base URL with account ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(''),
        headers: new Map(),
      });

      await call('fetchContent', { url: 'https://example.com' });

      expect(mockFetch.mock.calls[0][0]).toBe(
        'https://api.cloudflare.com/client/v4/accounts/test-account-id/browser-rendering/content'
      );
    });

    it('includes Bearer token in Authorization header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(''),
        headers: new Map(),
      });

      await call('fetchContent', { url: 'https://example.com' });

      expect(mockFetch.mock.calls[0][1].headers).toEqual(
        expect.objectContaining({
          Authorization: 'Bearer test-api-token',
          'Content-Type': 'application/json',
        })
      );
    });
  });
});
