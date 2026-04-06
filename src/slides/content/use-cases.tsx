import { Bot, Camera, FileText, Eye, Search, Database } from 'lucide-react';
import { Reveal } from '../components/reveal';
import { SlideLayout } from '../components/slide-layout';
import type { SlideProperties } from '../types';

const useCases = [
  { icon: Bot, label: 'AI / RAG Pipelines', description: 'Feed clean web content into LLMs' },
  { icon: Camera, label: 'Screenshot Services', description: 'Capture visual snapshots at scale' },
  { icon: FileText, label: 'PDF Generation', description: 'Render any URL or HTML to PDF' },
  { icon: Eye, label: 'Content Monitoring', description: 'Track changes across sites' },
  { icon: Search, label: 'SEO Analysis', description: 'Audit rendered markup and metadata' },
  { icon: Database, label: 'Data Extraction', description: 'Scrape structured data from pages' },
];

export function UseCasesSlide({ step }: SlideProperties) {
  return (
    <SlideLayout>
      <Reveal visible={step >= 0} direction="left" delay={0}>
        <h2 className="font-sans text-5xl font-semibold tracking-tight text-cf-text">
          What can you build?
        </h2>
      </Reveal>

      <div className="mt-12 grid grid-cols-3 gap-5">
        {useCases.map((uc, i) => {
          const row = Math.floor(i / 3);
          const visible = step >= row + 1;
          return (
            <Reveal key={uc.label} visible={visible} direction="up" delay={0.05} index={i % 3}>
              <div className="flex flex-col items-start gap-3 rounded-lg border border-cf-border bg-cf-bg-200 p-5 shadow-card">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-cf-orange-light text-cf-orange">
                  <uc.icon size={18} />
                </div>
                <div>
                  <h3 className="font-sans text-base font-semibold text-cf-text">{uc.label}</h3>
                  <p className="mt-0.5 text-sm text-cf-text-muted">{uc.description}</p>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </SlideLayout>
  );
}

UseCasesSlide.steps = 3;
