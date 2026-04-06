import { Reveal } from '../components/reveal';
import { SlideLayout } from '../components/slide-layout';
import { SlideTitle } from '../components/slide-title';
import type { SlideProperties } from '../types';

const CODE = `// 1. Start the crawl
const start = await fetch(
  \`https://api.cloudflare.com/client/v4/accounts/\${accountId}/browser-rendering/crawl\`,
  {
    method: 'POST',
    headers: { Authorization: \`Bearer \${apiToken}\`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'https://example.com', maxPages: 10 }),
  }
);
const { result: { id } } = await start.json();

// 2. Poll for results
const poll = await fetch(
  \`https://api.cloudflare.com/client/v4/accounts/\${accountId}/browser-rendering/crawl/\${id}\`,
  { headers: { Authorization: \`Bearer \${apiToken}\` } }
);
const { result } = await poll.json();
// result.status — "complete" | "pending"
// result.pages  — array of crawled page data`;

export function CrawlSlide({ step }: SlideProperties) {
  return (
    <SlideLayout>
      <SlideTitle number="09" title="Crawl" subtitle="Asynchronously crawl multiple pages from a starting URL." step={step} />
      <Reveal visible={step >= 1} direction="up" delay={0.1}>
        <div className="dark-surface rounded-lg border border-surface-dark-border p-5 font-mono text-sm leading-relaxed mt-6">
          <pre className="text-surface-dark-text whitespace-pre-wrap">{CODE}</pre>
        </div>
      </Reveal>
    </SlideLayout>
  );
}
CrawlSlide.steps = 2;
