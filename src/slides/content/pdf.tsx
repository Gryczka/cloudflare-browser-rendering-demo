import { Reveal } from '../components/reveal';
import { SlideLayout } from '../components/slide-layout';
import { SlideTitle } from '../components/slide-title';
import type { SlideProperties } from '../types';

const CODE = `POST /pdf
{ "url": "https://example.com" }

// With options — pdfOptions, not top-level query params.
POST /pdf
{
  "url": "https://example.com",
  "pdfOptions": {
    "format": "A4",
    "landscape": false,
    "printBackground": true,
    "scale": 1,
    "margin": { "top": "1cm", "bottom": "1cm" },
    "displayHeaderFooter": true,
    "footerTemplate": "<span class=pageNumber></span>"
  }
}

// From custom HTML instead of a URL
POST /pdf
{
  "html": "<h1>Hello World</h1><p>Generated PDF</p>",
  "pdfOptions": { "format": "A4" }
}

// Response: application/pdf (50 MB request body limit)`;

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
