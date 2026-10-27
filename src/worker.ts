import start from '@tanstack/react-start/server-entry';
import { deadline } from './server/budget-policy';
import { PUBLIC_PATHS } from './shared/garden';
export { BrowserBudget } from './server/browser-budget';

/** Bound serialized server-function input before TanStack decoding or provider dispatch. */
export default {
  async fetch(request: Request) {
    if (request.method !== 'GET' && request.method !== 'HEAD' && request.body) {
      const reader = request.body.getReader();
      const chunks: Uint8Array[] = [];
      let total = 0;
      const end = Date.now() + 10_000;
      try {
        while (true) {
          const part = await deadline(
            reader.read(),
            Math.max(1, end - Date.now()),
          );
          if (part.done) break;
          total += part.value.byteLength;
          if (total > 65_536) {
            await reader.cancel();
            return new Response('Request body is too large', { status: 413 });
          }
          chunks.push(part.value);
        }
      } catch {
        await reader.cancel().catch(() => undefined);
        return new Response('Request body deadline exceeded', { status: 408 });
      } finally {
        reader.releaseLock();
      }
      const bytes = new Uint8Array(total);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
      }
      request = new Request(request, { body: bytes });
    }
    const original = await start.fetch(request);
    const response = new Response(original.body, original);
    const path = new URL(request.url).pathname;
    if (
      (request.method === 'GET' || request.method === 'HEAD') &&
      PUBLIC_PATHS.includes(path) &&
      response.ok &&
      response.headers.get('content-type')?.includes('text/html')
    ) {
      response.headers.set('Cache-Control', 'public, max-age=60');
    } else {
      response.headers.set('X-Robots-Tag', 'noindex, nofollow');
      response.headers.set('Cache-Control', 'no-store');
    }
    return response;
  },
} satisfies ExportedHandler<Env>;
