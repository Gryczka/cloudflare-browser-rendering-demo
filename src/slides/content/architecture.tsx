import { ArrowRight } from 'lucide-react';
import { Reveal } from '../components/reveal';
import { SlideLayout } from '../components/slide-layout';
import type { SlideProperties } from '../types';

const steps = [
  { num: '1', title: 'REST API Call', description: 'Send a request to the Browser Rendering endpoint' },
  { num: '2', title: 'Headless Chrome', description: 'Cloudflare spins up a browser on the nearest edge' },
  { num: '3', title: 'Returns Result', description: 'Get screenshots, PDFs, HTML, Markdown, or JSON back' },
];

export function ArchitectureSlide({ step }: SlideProperties) {
  return (
    <SlideLayout>
      <Reveal visible={step >= 0} direction="left" delay={0}>
        <h2 className="font-sans text-5xl font-semibold tracking-tight text-cf-text">
          How it Works
        </h2>
      </Reveal>

      <div className="mt-16 flex items-center justify-center gap-4">
        {steps.map((s, i) => {
          const visible = i === 0 ? step >= 0 : step >= 1;
          return (
            <div key={s.num} className="flex items-center gap-4">
              <Reveal visible={visible} direction="up" delay={0.1} index={i}>
                <div className="flex w-56 flex-col items-center gap-3 rounded-lg border border-cf-border bg-cf-bg-200 p-6 text-center shadow-card">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cf-orange font-mono text-xl font-bold text-white">
                    {s.num}
                  </div>
                  <h3 className="font-sans text-lg font-semibold text-cf-text">{s.title}</h3>
                  <p className="text-sm text-cf-text-muted">{s.description}</p>
                </div>
              </Reveal>
              {i < steps.length - 1 && (
                <Reveal visible={visible} direction="none" delay={0.2 + i * 0.1}>
                  <ArrowRight size={24} className="text-cf-orange" />
                </Reveal>
              )}
            </div>
          );
        })}
      </div>

      <Reveal visible={step >= 1} direction="up" delay={0.5}>
        <p className="mt-12 text-center text-base text-cf-text-muted">
          No infrastructure to manage. No browser pools. Just an API call.
        </p>
      </Reveal>
    </SlideLayout>
  );
}

ArchitectureSlide.steps = 2;
