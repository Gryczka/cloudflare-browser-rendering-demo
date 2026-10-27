import { createFileRoute, Link } from '@tanstack/react-router';
import {
  Camera,
  FileDown,
  Code,
  FileText,
  Scissors,
  Brain,
  Link2,
  Layers,
  Globe,
  Accessibility,
  Plug,
} from 'lucide-react';
import { Callout } from '../components/Callout';

export const Route = createFileRoute('/')({ component: Home });
import { gardenUrl } from '../shared/garden';

const features = [
  {
    icon: Camera,
    title: 'Screenshot',
    description:
      'Capture PNG, WebP, or JPEG screenshots of any webpage. Supports full-page capture and custom viewports.',
    to: '/screenshot',
    endpoint: '/screenshot',
  },
  {
    icon: FileDown,
    title: 'PDF Generation',
    description:
      'Generate PDF documents from URLs or custom HTML. Configure page format, orientation, and background printing.',
    to: '/pdf',
    endpoint: '/pdf',
  },
  {
    icon: Code,
    title: 'HTML Content',
    description:
      'Fetch the fully-rendered HTML of a page after JavaScript execution. Get the DOM as the browser sees it.',
    to: '/content',
    endpoint: '/content',
  },
  {
    icon: FileText,
    title: 'Markdown Extraction',
    description:
      'Convert any webpage into clean Markdown format. Ideal for feeding content into LLMs and RAG pipelines.',
    to: '/markdown',
    endpoint: '/markdown',
  },
  {
    icon: Scissors,
    title: 'Web Scraping',
    description:
      'Extract structured data from specific HTML elements using CSS selectors. Get text, HTML, and attributes.',
    to: '/scrape',
    endpoint: '/scrape',
  },
  {
    icon: Brain,
    title: 'AI JSON Extraction',
    description:
      'Use AI to extract structured data from any webpage. Define output with a prompt or JSON schema.',
    to: '/json',
    endpoint: '/json',
  },
  {
    icon: Link2,
    title: 'Link Discovery',
    description:
      'Retrieve all links from a webpage. Useful for site mapping, SEO analysis, and content discovery.',
    to: '/links',
    endpoint: '/links',
  },
  {
    icon: Layers,
    title: 'Snapshot',
    description:
      'Capture both the rendered HTML and a screenshot in a single request. Two outputs, one API call.',
    to: '/snapshot',
    endpoint: '/snapshot',
  },
  {
    icon: Accessibility,
    title: 'Accessibility Tree',
    description:
      "Capture Chrome's semantic tree — roles, names, and hierarchy. A compact structural view of a page for AI agents.",
    to: '/accessibility',
    endpoint: '/accessibilityTree',
    badge: 'NEW',
  },
  {
    icon: Globe,
    title: 'Crawl',
    description:
      'Crawl entire websites with a single API call. Follow links, respect robots.txt, and return content in multiple formats.',
    to: '/crawl',
    endpoint: '/crawl',
    badge: 'BETA',
  },
  {
    icon: Plug,
    title: 'Binding vs REST',
    description:
      'The same Quick Action over REST with a bearer token, and through env.BROWSER.quickAction() with no token at all.',
    to: '/binding',
    endpoint: 'env.BROWSER',
    badge: 'NEW',
  },
] as const;

function Home() {
  return (
    <div className="max-w-5xl mx-auto">
      {/* Hero */}
      <div className="mb-10">
        <h1 className="text-5xl font-bold tracking-tight text-cf-text mb-3">
          Browser Run
        </h1>
        <p className="text-xl text-cf-text-muted max-w-2xl">
          Run headless Chrome on Cloudflare's global network. Capture
          screenshots, generate PDFs, scrape content, extract structured data
          with AI, and crawl entire websites.
        </p>
        <div className="flex gap-4 mt-6">
          <a
            href={gardenUrl('https://developers.cloudflare.com/browser-run/')}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-base btn-primary"
          >
            Documentation
          </a>
          <a
            href={gardenUrl(
              'https://developers.cloudflare.com/browser-run/quick-actions/',
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-base btn-ghost"
          >
            Quick Actions Reference
          </a>
        </div>
      </div>

      {/* Endpoints Grid */}
      <div className="mb-8">
        <h2 className="text-[10px] font-medium text-cf-text-subtle uppercase tracking-wider mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature) => (
            <Link
              key={feature.to}
              to={feature.to}
              className="group block rounded-xl border border-cf-border bg-cf-bg-200 p-5 shadow-card transition-all hover:border-cf-orange/50 hover:shadow-lg"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="rounded-lg bg-cf-orange-light p-2 text-cf-orange transition-colors group-hover:bg-cf-orange group-hover:text-white">
                  <feature.icon size={20} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-cf-text group-hover:text-cf-orange transition-colors">
                      {feature.title}
                    </h3>
                    {'badge' in feature && feature.badge && (
                      <span className="font-mono text-[10px] text-cf-orange">
                        {feature.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-mono text-cf-text-subtle mt-0.5">
                    {feature.endpoint}
                  </p>
                </div>
              </div>
              <p className="text-sm text-cf-text-muted leading-relaxed">
                {feature.description}
              </p>
            </Link>
          ))}
        </div>
      </div>

      {/* Info */}
      <Callout>
        <strong className="text-cf-text">Getting started:</strong> Each demo
        page lets you try one Browser Run Quick Action interactively. Enter a
        URL, click Run, and see the result. Requests are proxied through the
        Worker, which injects the API token server-side.
      </Callout>
    </div>
  );
}
