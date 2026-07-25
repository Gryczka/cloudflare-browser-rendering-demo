import { Globe, Code, Brain, ShieldCheck } from 'lucide-react';
import { Reveal } from '../components/reveal';
import { SlideLayout } from '../components/slide-layout';
import type { SlideProperties } from '../types';

const cards = [
  { icon: Globe, label: 'Websites run JavaScript', description: 'Static fetches miss dynamic content' },
  { icon: Code, label: 'SPAs need a real browser', description: 'Client-rendered apps require full execution' },
  { icon: Brain, label: 'AI needs web content', description: 'LLMs need clean text from live pages' },
  { icon: ShieldCheck, label: 'Infrastructure is complex', description: 'Managing Puppeteer at scale is hard' },
];

export function ProblemSlide({ step }: SlideProperties) {
  return (
    <SlideLayout>
      <Reveal visible={step >= 0} direction="left" delay={0}>
        <h2 className="font-sans text-5xl font-semibold tracking-tight text-cf-text">
          Why Browser Run?
        </h2>
      </Reveal>

      <div className="mt-12 grid grid-cols-2 gap-6">
        {cards.map((card, i) => {
          const visible = i < 2 ? step >= 0 : step >= 1;
          return (
            <Reveal key={card.label} visible={visible} direction="up" delay={0.1} index={i % 2}>
              <div className="flex items-start gap-4 rounded-lg border border-cf-border bg-cf-bg-200 p-6 shadow-card">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cf-orange-light text-cf-orange">
                  <card.icon size={20} />
                </div>
                <div>
                  <h3 className="font-sans text-lg font-semibold text-cf-text">{card.label}</h3>
                  <p className="mt-1 text-sm text-cf-text-muted">{card.description}</p>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>

      <Reveal visible={step >= 1} direction="up" delay={0.3}>
        <p className="mt-10 text-center text-lg text-cf-text-muted">
          Cloudflare Browser Run solves all of this with a{' '}
          <span className="font-semibold text-cf-orange">simple REST API</span>.
        </p>
      </Reveal>
    </SlideLayout>
  );
}

ProblemSlide.steps = 2;
