// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { serve } = vi.hoisted(() => ({ serve: vi.fn() }));
vi.mock('@tanstack/react-start/server-entry', () => ({
  default: { fetch: serve },
}));
import worker from '../../worker';

beforeEach(() => {
  serve.mockReset();
});
afterEach(() => vi.useRealTimers());

describe('serialized request boundary', () => {
  it('rejects oversized chunked bodies before framework decoding', async () => {
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(65_537));
        controller.close();
      },
    });
    const response = await worker.fetch(
      new Request('https://demo.example/_server/action', {
        method: 'POST',
        body,
        duplex: 'half',
      } as RequestInit),
    );
    expect(response.status).toBe(413);
    expect(serve).not.toHaveBeenCalled();
  });

  it('rejects stalled bodies before framework decoding', async () => {
    vi.useFakeTimers();
    const response = worker.fetch(
      new Request('https://demo.example/_server/action', {
        method: 'POST',
        body: new ReadableStream(),
        duplex: 'half',
      } as RequestInit),
    );
    await vi.advanceTimersByTimeAsync(10_001);
    expect((await response).status).toBe(408);
    expect(serve).not.toHaveBeenCalled();
  });

  it('retains valid body/header semantics and prevents execution response indexing/caching', async () => {
    serve.mockImplementation(async (request: Request) => {
      expect(await request.text()).toBe('{"url":"https://example.com"}');
      expect(request.headers.get('content-type')).toBe('application/json');
      return Response.json({ result: 'mocked' });
    });
    const response = await worker.fetch(
      new Request('https://demo.example/_server/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"url":"https://example.com"}',
      }),
    );
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(response.headers.get('X-Robots-Tag')).toBe('noindex, nofollow');
  });

  it('keeps information pages cacheable without calling a provider', async () => {
    serve.mockResolvedValue(
      new Response('<h1>Browser Run</h1>', {
        headers: { 'Content-Type': 'text/html' },
      }),
    );
    const response = await worker.fetch(
      new Request('https://demo.example/crawl'),
    );
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=60');
  });
});
