import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Search, Bot, Archive } from 'lucide-react';
import DemoPage from '../components/DemoPage';
import SyntaxHighlight from '../components/SyntaxHighlight';
import UseCases from '../components/UseCases';
import ResultToolbar from '../components/ResultToolbar';
import { fetchContent } from '../server/browser-rendering';

export const Route = createFileRoute('/content')({ component: ContentDemo });

const apiCode = `const resp = await fetch(
  \`https://api.cloudflare.com/client/v4/accounts/\${accountId}/browser-rendering/content\`,
  {
    method: 'POST',
    headers: {
      Authorization: \`Bearer \${apiToken}\`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: 'https://example.com',
    }),
  }
);
// Returns: fully rendered HTML as text`;

const pills = [
  { label: 'example.com', value: 'https://example.com' },
  { label: 'cloudflare.com', value: 'https://cloudflare.com' },
  { label: 'news.ycombinator.com', value: 'https://news.ycombinator.com' },
];

function ContentDemo() {
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [browserMs, setBrowserMs] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'source' | 'preview'>('source');

  const handleRun = async (url: string) => {
    setLoading(true);
    setError(null);
    setHtml(null);
    setBrowserMs(null);
    try {
      const result = await fetchContent({ data: { url } });
      setHtml(result.html);
      setBrowserMs(result.browserMs);
    } catch (e: any) {
      setError(e.message || 'Content fetch failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DemoPage
      title="HTML Content"
      description="Fetch the fully-rendered HTML of a page after JavaScript execution. See the DOM exactly as the browser renders it."
      endpoint="POST /content"
      apiCode={apiCode}
      pills={pills}
      info="The /content endpoint fetches the rendered HTML from a URL after full JavaScript execution. This is useful for scraping single-page applications and dynamic content that requires JavaScript to render."
      onRun={handleRun}
      loading={loading}
      error={error}
      resultContent={
        html ? (
          <div>
            <ResultToolbar
              browserMs={browserMs}
              contentSize={html.length}
              contentLabel="characters"
              copyContent={html}
            />
            <div className="flex gap-2 mb-3 mt-3">
              <button
                onClick={() => setViewMode('source')}
                className={`px-3 py-1 text-sm rounded-lg cursor-pointer transition-colors ${viewMode === 'source' ? 'bg-cf-orange text-white' : 'bg-gray-100 text-cf-text'}`}
              >
                Source
              </button>
              <button
                onClick={() => setViewMode('preview')}
                className={`px-3 py-1 text-sm rounded-lg cursor-pointer transition-colors ${viewMode === 'preview' ? 'bg-cf-orange text-white' : 'bg-gray-100 text-cf-text'}`}
              >
                Preview
              </button>
            </div>
            {viewMode === 'source' ? (
              <div className="bg-cf-code-bg rounded-lg p-4 overflow-auto max-h-[500px]">
                <SyntaxHighlight code={html} language="html" className="text-xs" />
              </div>
            ) : (
              <iframe
                srcDoc={html}
                className="w-full h-[500px] rounded-lg border border-cf-border"
                title="HTML preview"
                sandbox="allow-same-origin"
              />
            )}
          </div>
        ) : undefined
      }
    >
      <UseCases
        cases={[
          { icon: <Bot size={18} />, title: 'SPA Scraping', description: 'Fetch fully-rendered HTML from JavaScript-heavy single-page applications that traditional scrapers miss.' },
          { icon: <Search size={18} />, title: 'SEO Auditing', description: 'See exactly what search engines see after JavaScript execution to debug rendering issues.' },
          { icon: <Archive size={18} />, title: 'Page Archival', description: 'Archive complete rendered snapshots of web pages for compliance or historical records.' },
        ]}
      />
    </DemoPage>
  );
}
