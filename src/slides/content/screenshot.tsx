import { Reveal } from '../components/reveal';
import { SlideLayout } from '../components/slide-layout';
import { SlideTitle } from '../components/slide-title';
import type { SlideProperties } from '../types';

const CODE = `GET /screenshot?url=https://example.com&viewport_width=1280&viewport_height=720

# With options
GET /screenshot?url=https://example.com
    &format=webp
    &quality=90
    &full_page=true
    &wait_for_selector=.main-content

# Response: binary image (PNG, WebP, or JPEG)`;

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
