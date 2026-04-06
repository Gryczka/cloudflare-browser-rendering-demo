import { Reveal } from '../components/reveal';
import { SlideLayout } from '../components/slide-layout';
import { SlideTitle } from '../components/slide-title';
import type { SlideProperties } from '../types';

const CODE = `const resp = await fetch(
  \`https://api.cloudflare.com/client/v4/accounts/\${accountId}/browser-rendering/json\`,
  {
    method: 'POST',
    headers: { Authorization: \`Bearer \${apiToken}\`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: 'https://example.com/products',
      prompt: 'Extract all product names, prices, and availability status.',
    }),
  }
);
const { result } = await resp.json();
// result contains AI-extracted structured JSON data`;

export function JSONSlide({ step }: SlideProperties) {
  return (
    <SlideLayout>
      <SlideTitle number="06" title="JSON Extraction" subtitle="Use AI to extract structured data from any page." step={step} />
      <Reveal visible={step >= 1} direction="up" delay={0.1}>
        <div className="dark-surface rounded-lg border border-surface-dark-border p-5 font-mono text-sm leading-relaxed mt-6">
          <pre className="text-surface-dark-text whitespace-pre-wrap">{CODE}</pre>
        </div>
      </Reveal>
    </SlideLayout>
  );
}
JSONSlide.steps = 2;
