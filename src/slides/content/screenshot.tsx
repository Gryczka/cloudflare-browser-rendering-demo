import { Reveal } from '../components/reveal';
import { SlideLayout } from '../components/slide-layout';
import { SlideTitle } from '../components/slide-title';
import type { SlideProperties } from '../types';

const CODE = `POST /screenshot
{ "url": "https://example.com" }

// With options — note these are nested, not query params.
POST /screenshot
{
  "url": "https://example.com",
  "screenshotOptions": {
    "type": "webp",
    "quality": 90,
    "fullPage": true
  },
  "viewport": { "width": 1280, "height": 720 },
  "waitForSelector": { "selector": ".main-content" }
}

// Response: binary image bytes (PNG, WebP, or JPEG).
// The default viewport is 1920x1080.`;

export function ScreenshotSlide({ step }: SlideProperties) {
  return (
    <SlideLayout>
      <SlideTitle number="01" title="Screenshot" subtitle="Capture full-page or viewport screenshots in PNG, WebP, or JPEG" step={step} />

      <Reveal visible={step >= 1} direction="up" delay={0.1}>
        <div className="mt-10 dark-surface rounded-lg border border-surface-dark-border p-5 font-mono text-sm leading-relaxed">
          <pre className="text-surface-dark-text whitespace-pre-wrap">
            {CODE}
          </pre>
        </div>
      </Reveal>
    </SlideLayout>
  );
}

ScreenshotSlide.steps = 2;
