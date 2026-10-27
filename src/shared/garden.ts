export const PUBLIC_ORIGIN =
  'https://cloudflare-browser-rendering-demo.dwarven.workers.dev';
export const PUBLIC_PATHS = [
  '/',
  '/screenshot',
  '/pdf',
  '/content',
  '/markdown',
  '/scrape',
  '/json',
  '/links',
  '/snapshot',
  '/accessibility',
  '/binding',
  '/crawl',
  '/slides',
];

/** Resource navigation only: never decorate execution inputs or API examples. */
export function gardenUrl(raw: string): string {
  try {
    const url = new URL(raw);
    if (
      url.protocol !== 'https:' ||
      !/(^|\.)cloudflare\.com$/.test(url.hostname)
    )
      return raw;
    const resource =
      url.pathname.split('/').filter(Boolean).join('-') || 'overview';
    url.searchParams.set('utm_source', 'gryczka.dev');
    url.searchParams.set('utm_medium', 'referral');
    url.searchParams.set('utm_campaign', 'app-garden');
    url.searchParams.set('utm_content', `browser-run-${resource}`);
    url.searchParams.set('utm_term', 'browser-run');
    return url.href;
  } catch {
    return raw;
  }
}
