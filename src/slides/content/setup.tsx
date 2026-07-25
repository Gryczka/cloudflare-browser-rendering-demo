import { Reveal } from '../components/reveal';
import { SlideLayout } from '../components/slide-layout';
import type { SlideProperties } from '../types';

const CODE = `# Base URL (the API path is still /browser-rendering)
https://api.cloudflare.com/client/v4/accounts/{account_id}/browser-rendering

# Authentication header
Authorization: Bearer {api_token}

# Example: take a screenshot
curl -X POST \\
  "https://api.cloudflare.com/client/v4/accounts/{account_id}/browser-rendering/screenshot" \\
  -H "Authorization: Bearer {api_token}" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://example.com"}' \\
  --output screenshot.png`;

export function SetupSlide({ step }: SlideProperties) {
  return (
    <SlideLayout>
      <Reveal visible={step >= 0} direction="left" delay={0}>
        <h2 className="font-sans text-5xl font-semibold tracking-tight text-cf-text">
          Getting Started
        </h2>
      </Reveal>

      <Reveal visible={step >= 1} direction="up" delay={0.1}>
        <div className="mt-10 dark-surface rounded-lg border border-surface-dark-border p-5 font-mono text-sm leading-relaxed">
          <pre className="text-surface-dark-text whitespace-pre-wrap">
            {CODE}
          </pre>
        </div>
      </Reveal>

      <Reveal visible={step >= 1} direction="up" delay={0.25}>
        <div className="mt-6 flex items-start gap-3 rounded-lg border border-cf-info/30 bg-cf-info/5 px-5 py-4">
          <span className="mt-0.5 text-cf-info">ℹ</span>
          <p className="text-sm text-cf-text-muted">
            Create an API token in the{' '}
            <span className="font-semibold text-cf-text">Cloudflare Dashboard</span> with the{' '}
            <span className="font-mono text-cf-orange">Account &gt; Browser Rendering &gt; Edit</span>{' '}
            permission.
          </p>
        </div>
      </Reveal>
    </SlideLayout>
  );
}

SetupSlide.steps = 2;
