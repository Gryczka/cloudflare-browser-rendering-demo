// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { gardenUrl, PUBLIC_PATHS } from '../../shared/garden';

describe('public discovery contract', () => {
  it('attributes Cloudflare resources while retaining query parameters and fragments', () => {
    const url = new URL(
      gardenUrl('https://developers.cloudflare.com/browser-run/?lang=en#crawl'),
    );
    expect(url.searchParams.get('lang')).toBe('en');
    expect(url.hash).toBe('#crawl');
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      utm_source: 'gryczka.dev',
      utm_medium: 'referral',
      utm_campaign: 'app-garden',
      utm_content: 'browser-run-browser-run',
      utm_term: 'browser-run',
    });
    expect(gardenUrl('https://cloudflare.com.evil.example/')).toBe(
      'https://cloudflare.com.evil.example/',
    );
  });
  it('lists only public pages and excludes execution from robots', () => {
    const sitemap = readFileSync(
      new URL('../../../public/sitemap.xml', import.meta.url),
      'utf8',
    );
    const robots = readFileSync(
      new URL('../../../public/robots.txt', import.meta.url),
      'utf8',
    );
    for (const path of PUBLIC_PATHS)
      expect(sitemap).toContain(`.workers.dev${path}</loc>`);
    expect(sitemap).not.toContain('/_server/');
    expect(robots).toContain(
      'Content-Signal: search=yes,ai-input=yes,ai-train=no',
    );
    expect(robots).toContain('Disallow: /_server/');
  });
});
