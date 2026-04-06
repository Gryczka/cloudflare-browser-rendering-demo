import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Table, ShoppingCart, BarChart3 } from 'lucide-react';
import DemoPage from '../components/DemoPage';
import PillButton from '../components/PillButton';
import SyntaxHighlight from '../components/SyntaxHighlight';
import UseCases from '../components/UseCases';
import ResultToolbar from '../components/ResultToolbar';
import { scrapeContent } from '../server/browser-rendering';

export const Route = createFileRoute('/scrape')({ component: ScrapeDemo });

const apiCode = `const resp = await fetch(
  \`https://api.cloudflare.com/client/v4/accounts/\${accountId}/browser-rendering/scrape\`,
  {
    method: 'POST',
    headers: {
      Authorization: \`Bearer \${apiToken}\`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: 'https://example.com',
      elements: [
        { selector: 'h1' },
        { selector: 'a' },
      ],
    }),
  }
);
// Returns: { results: [{ selector, results: [{ text, html, attributes }] }] }`;

const presets = [
  {
    label: 'HN titles',
    url: 'https://news.ycombinator.com',
    selectors: '.titleline > a',
  },
  {
    label: 'Example headings',
    url: 'https://example.com',
    selectors: 'h1, p',
  },
  {
    label: 'CF docs nav',
    url: 'https://developers.cloudflare.com/browser-rendering/',
    selectors: 'h1, h2, a',
  },
];

function ScrapeDemo() {
  const [url, setUrl] = useState('');
  const [selectors, setSelectors] = useState('h1, a');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [browserMs, setBrowserMs] = useState<string | null>(null);
  const [resultView, setResultView] = useState<'table' | 'json'>('table');

  const handleRun = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setBrowserMs(null);
    try {
      const elements = selectors
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((selector) => ({ selector }));
      const res = await scrapeContent({ data: { url, elements } });
      setResult(res.result);
      setBrowserMs(res.browserMs);
    } catch (e: any) {
      setError(e.message || 'Scrape failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DemoPage
      title="Web Scraping"
      description="Extract structured data from specific HTML elements using CSS selectors. Get text content, inner HTML, and element attributes."
      endpoint="POST /scrape"
      apiCode={apiCode}
      info="The /scrape endpoint extracts data from specific page elements using CSS selectors. Each selector returns matching elements with their text, HTML, attributes, and layout dimensions."
      loading={loading}
      error={error}
      resultContent={
        result ? (
          <div>
            <ResultToolbar
              browserMs={browserMs}
              contentSize={JSON.stringify(result).length}
              contentLabel="JSON"
              copyContent={JSON.stringify(result, null, 2)}
              download={{ data: JSON.stringify(result, null, 2), filename: 'scrape-results.json', mime: 'application/json' }}
            />
            <div className="flex gap-2 my-3">
              <button onClick={() => setResultView('table')} className={`px-3 py-1 text-sm rounded-lg cursor-pointer transition-colors ${resultView === 'table' ? 'bg-cf-orange text-white' : 'bg-gray-100 text-cf-text'}`}>Table</button>
              <button onClick={() => setResultView('json')} className={`px-3 py-1 text-sm rounded-lg cursor-pointer transition-colors ${resultView === 'json' ? 'bg-cf-orange text-white' : 'bg-gray-100 text-cf-text'}`}>JSON</button>
            </div>
            {resultView === 'table' ? (
              <div className="overflow-auto max-h-[500px]">
                {(result.results || result.result?.results || [result]).map((group: any, gi: number) => (
                  <div key={gi} className="mb-4">
                    {group.selector && <p className="text-xs font-mono text-cf-orange mb-2">Selector: {group.selector}</p>}
                    <table className="w-full text-sm border-collapse">
                      <thead className="sticky top-0 bg-gray-50"><tr className="border-b border-cf-border">
                        <th className="text-left p-2 text-cf-text-muted font-medium text-xs">#</th>
                        <th className="text-left p-2 text-cf-text-muted font-medium text-xs">Text</th>
                        <th className="text-left p-2 text-cf-text-muted font-medium text-xs">Tag</th>
                      </tr></thead>
                      <tbody>
                        {(group.results || []).slice(0, 50).map((item: any, j: number) => (
                          <tr key={j} className="border-b border-cf-border/50 hover:bg-gray-50">
                            <td className="p-2 text-cf-text-muted text-xs">{j + 1}</td>
                            <td className="p-2 text-cf-text text-xs max-w-[400px] truncate">{item.text || '-'}</td>
                            <td className="p-2 text-xs font-mono text-cf-text-muted">{item.tag || item.attributes?.tag || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-cf-code-bg rounded-lg p-4 overflow-auto max-h-[500px]">
                <SyntaxHighlight code={JSON.stringify(result, null, 2)} language="json" className="text-xs" />
              </div>
            )}
          </div>
        ) : undefined
      }
      customForm={
        <div className="mb-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-cf-text mb-1">
              URL
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter a URL..."
              className="w-full px-4 py-3 rounded-xl border border-cf-border bg-white text-cf-text placeholder-cf-text-muted focus:outline-none focus:border-cf-orange focus:ring-2 focus:ring-cf-orange/20 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-cf-text mb-1">
              CSS Selectors (comma-separated)
            </label>
            <input
              type="text"
              value={selectors}
              onChange={(e) => setSelectors(e.target.value)}
              placeholder="h1, a, .class-name"
              className="w-full px-4 py-3 rounded-xl border border-cf-border bg-white text-cf-text placeholder-cf-text-muted focus:outline-none focus:border-cf-orange focus:ring-2 focus:ring-cf-orange/20 transition-all font-mono text-sm"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRun}
              disabled={loading || !url.trim()}
              className="px-6 py-3 bg-cf-orange hover:bg-cf-orange-dark text-white font-semibold rounded-xl transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? 'Scraping...' : 'Run'}
            </button>
            <div className="flex flex-wrap gap-2">
              {presets.map((p) => (
                <PillButton
                  key={p.label}
                  label={p.label}
                  onClick={() => {
                    setUrl(p.url);
                    setSelectors(p.selectors);
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      }
    >
      <UseCases
        cases={[
          { icon: <ShoppingCart size={18} />, title: 'Price Monitoring', description: 'Extract product prices and availability from e-commerce sites to track competitors.' },
          { icon: <Table size={18} />, title: 'Data Collection', description: 'Scrape structured data like tables, lists, and contact info from any rendered page.' },
          { icon: <BarChart3 size={18} />, title: 'Content Aggregation', description: 'Pull headlines, summaries, and metadata from news sites and blogs at scale.' },
        ]}
      />
    </DemoPage>
  );
}
