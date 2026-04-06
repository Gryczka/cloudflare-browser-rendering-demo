import { Reveal } from '../components/reveal';
import { SlideLayout } from '../components/slide-layout';
import { SlideTitle } from '../components/slide-title';
import type { SlideProperties } from '../types';

const CODE = `GET /pdf?url=https://example.com

# With options
GET /pdf?url=https://example.com
    &format=A4
    &landscape=false
    &print_background=true
    &scale=1
    &margin_top=1cm
    &margin_bottom=1cm

# From custom HTML (POST)
POST /pdf
Content-Type: application/json

{
  "html": "<h1>Hello World</h1><p>Generated PDF</p>",
  "format": "A4"
}

# Response: application/pdf`;

export function PDFSlide({ step }: SlideProperties) {
  return (
    <SlideLayout>
      <SlideTitle number="02" title="PDF Generation" subtitle="Generate PDFs from any URL or custom HTML" step={step} />

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

PDFSlide.steps = 2;
