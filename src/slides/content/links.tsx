import { Reveal } from '../components/reveal';
import { SlideLayout } from '../components/slide-layout';
import { SlideTitle } from '../components/slide-title';
import type { SlideProperties } from '../types';

const CODE = `const resp = await fetch(
  \`https://api.cloudflare.com/client/v4/accounts/\${accountId}/browser-rendering/links\`,
  {
    method: 'POST',
    headers: { Authorization: \`Bearer \${apiToken}\`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'https://example.com' }),
  }
);
const { result } = await resp.json();
// result is a flat array of absolute URL strings
// ["https://example.com/", "https://example.com/about", ...]`;

export function LinksSlide({ step }: SlideProperties) {
  return (
    <SlideLayout>
      <SlideTitle number="07" title="Links" subtitle="Extract all links from a rendered page." step={step} />
      <Reveal visible={step >= 1} direction="up" delay={0.1}>
        <div className="dark-surface rounded-lg border border-surface-dark-border p-5 font-mono text-sm leading-relaxed mt-6">
          <pre className="text-surface-dark-text whitespace-pre-wrap">{CODE}</pre>
        </div>
      </Reveal>
    </SlideLayout>
  );
}
LinksSlide.steps = 2;
