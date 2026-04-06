import { TitleSlide } from './content/title';
import { ProblemSlide } from './content/problem';
import { UseCasesSlide } from './content/use-cases';
import { ArchitectureSlide } from './content/architecture';
import { SetupSlide } from './content/setup';
import { ScreenshotSlide } from './content/screenshot';
import { PDFSlide } from './content/pdf';
import { ContentSlide } from './content/content';
import { MarkdownSlide } from './content/markdown';
import { ScrapeSlide } from './content/scrape';
import { JSONSlide } from './content/json';
import { LinksSlide } from './content/links';
import { SnapshotSlide } from './content/snapshot';
import { CrawlSlide } from './content/crawl';
import { ClosingSlide } from './content/closing';

import type { SlideDefinition } from './types';

export const SLIDES: SlideDefinition[] = [
  // Intro arc: what, why, how
  { id: 'title', title: 'Browser Rendering', component: TitleSlide, steps: TitleSlide.steps },
  { id: 'problem', title: 'Why Browser Rendering', component: ProblemSlide, steps: ProblemSlide.steps },
  { id: 'use-cases', title: 'Use Cases', component: UseCasesSlide, steps: UseCasesSlide.steps },
  { id: 'architecture', title: 'How it Works', component: ArchitectureSlide, steps: ArchitectureSlide.steps },
  { id: 'setup', title: 'Getting Started', component: SetupSlide, steps: SetupSlide.steps },

  // Feature demos
  { id: 'screenshot', title: 'Screenshot', component: ScreenshotSlide, steps: ScreenshotSlide.steps },
  { id: 'pdf', title: 'PDF Generation', component: PDFSlide, steps: PDFSlide.steps },
  { id: 'content', title: 'HTML Content', component: ContentSlide, steps: ContentSlide.steps },
  { id: 'markdown', title: 'Markdown', component: MarkdownSlide, steps: MarkdownSlide.steps },
  { id: 'scrape', title: 'Web Scraping', component: ScrapeSlide, steps: ScrapeSlide.steps },
  { id: 'json', title: 'AI JSON Extraction', component: JSONSlide, steps: JSONSlide.steps },
  { id: 'links', title: 'Link Discovery', component: LinksSlide, steps: LinksSlide.steps },
  { id: 'snapshot', title: 'Snapshot', component: SnapshotSlide, steps: SnapshotSlide.steps },
  { id: 'crawl', title: 'Website Crawl', component: CrawlSlide, steps: CrawlSlide.steps },

  // Closing
  { id: 'closing', title: 'Get Started', component: ClosingSlide, steps: ClosingSlide.steps },
];
