import { Reveal } from '../components/reveal';
import { SlideLayout } from '../components/slide-layout';
import { SlideTitle } from '../components/slide-title';
import type { SlideProperties } from '../types';

const CODE = `const resp = await fetch(
  \`https://api.cloudflare.com/client/v4/accounts/\${accountId}/browser-rendering/snapshot\`,
  {
    method: 'POST',
    headers: { Authorization: \`Bearer \${apiToken}\`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: 'https://example.com',
      screenshotOptions: { fullPage: true },
    }),
  }
);
const { result } = await resp.json();
// result.screenshot — base64-encoded PNG screenshot
// result.content   — fully rendered HTML of the page`;

export function SnapshotSlide({ step }: SlideProperties) {
  return (
    <SlideLayout>
      <SlideTitle number="08" title="Snapshot" subtitle="Capture a screenshot and HTML content in a single request." step={step} />
      <Reveal visible={step >= 1} direction="up" delay={0.1}>
        <div className="dark-surface rounded-lg border border-surface-dark-border p-5 font-mono text-sm leading-relaxed mt-6">
          <pre className="text-surface-dark-text whitespace-pre-wrap">{CODE}</pre>
        </div>
      </Reveal>
    </SlideLayout>
  );
}
SnapshotSlide.steps = 2;
