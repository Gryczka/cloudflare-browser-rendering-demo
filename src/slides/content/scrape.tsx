import { Reveal } from '../components/reveal';
import { SlideLayout } from '../components/slide-layout';
import { SlideTitle } from '../components/slide-title';
import type { SlideProperties } from '../types';

const CODE = `const resp = await fetch(
  \`https://api.cloudflare.com/client/v4/accounts/\${accountId}/browser-rendering/scrape\`,
  {
    method: 'POST',
    headers: { Authorization: \`Bearer \${apiToken}\`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: 'https://example.com',
      elements: [
        { selector: 'h1' },
        { selector: '.product-price' },
        { selector: 'meta[name="description"]' },
      ],
    }),
  }
);
const { result } = await resp.json();
// result contains matched elements with their text and attributes`;

export function ScrapeSlide({ step }: SlideProperties) {
  return (
    <SlideLayout>
      <SlideTitle number="05" title="Scrape" subtitle="Extract specific elements from a page using CSS selectors." step={step} />
      <Reveal visible={step >= 1} direction="up" delay={0.1}>
        <div className="dark-surface rounded-lg border border-surface-dark-border p-5 font-mono text-sm leading-relaxed mt-6">
          <pre className="text-surface-dark-text whitespace-pre-wrap">{CODE}</pre>
        </div>
      </Reveal>
    </SlideLayout>
  );
}
ScrapeSlide.steps = 2;
