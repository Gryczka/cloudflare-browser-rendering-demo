import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Table, ShoppingCart, BarChart3 } from 'lucide-react';
import DemoPage from '../components/DemoPage';
import PillButton from '../components/PillButton';
import SyntaxHighlight from '../components/SyntaxHighlight';
import UseCases from '../components/UseCases';
import ResultToolbar from '../components/ResultToolbar';
import { scrapeContent, type ScrapeGroup } from '../server/browser-rendering';

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
const { result } = await resp.json();
// result: [{ selector, results: [{ text, html, attributes, width, height }] }]`;

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
    url: 'https://developers.cloudflare.com/browser-run/',
    selectors: 'h1, h2, a',
  },
];

function ScrapeDemo() {
  const [url, setUrl] = useState('');
  const [selectors, setSelectors] = useState('h1, a');
  const [groups, setGroups] = useState<Array<ScrapeGroup> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [browserMs, setBrowserMs] = useState<number | null>(null);
  const [resultView, setResultView] = useState<'table' | 'json'>('table');

  const handleRun = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setGroups(null);
    setBrowserMs(null);
    try {
      const elements = selectors
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((selector) => ({ selector }));
      const res = await scrapeContent({ data: { url, elements } });
      setGroups(res.result);
      setBrowserMs(res.browserMs);
    } catch (e: any) {
      setError(e.message || 'Scrape failed');
    } finally {
      setLoading(false);
    }
  };

  const totalMatches = (groups ?? []).reduce(
    (sum, group) => sum + (group.results?.length ?? 0),
    0
  );

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
        groups ? (
          <div>
            <ResultToolbar
              browserMs={browserMs}
              contentSize={JSON.stringify(groups).length}
              contentLabel="JSON"
              copyContent={JSON.stringify(groups, null, 2)}
              download={{ data: JSON.stringify(groups, null, 2), filename: 'scrape-results.json', mime: 'application/json' }}
            />
            <div className="flex items-center gap-2 my-3">
              <button onClick={() => setResultView('table')} className={`cursor-pointer rounded-lg px-3 py-1 text-sm transition-colors ${resultView === 'table' ? 'bg-cf-orange text-cf-on-orange' : 'bg-cf-bg-300 text-cf-text'}`}>Table</button>
              <button onClick={() => setResultView('json')} className={`cursor-pointer rounded-lg px-3 py-1 text-sm transition-colors ${resultView === 'json' ? 'bg-cf-orange text-cf-on-orange' : 'bg-cf-bg-300 text-cf-text'}`}>JSON</button>
              <p className="ml-1 text-sm text-cf-text-muted">
                {totalMatches} match{totalMatches === 1 ? '' : 'es'} across{' '}
                {groups.length} selector{groups.length === 1 ? '' : 's'}
              </p>
            </div>
            {resultView === 'table' ? (
              <div className="max-h-[500px] overflow-auto">
                {groups.length === 0 ? (
                  <p className="rounded-lg border border-cf-border bg-cf-bg-200 p-4 text-sm text-cf-text-muted">
                    No elements matched those selectors.
                  </p>
                ) : (
                  groups.map((group, gi) => (
                    <div key={`${group.selector}-${gi}`} className="mb-5">
                      <p className="mb-2 font-mono text-xs text-cf-orange">
                        {group.selector}
                        <span className="ml-2 text-cf-text-subtle">
                          {group.results?.length ?? 0} match
                          {(group.results?.length ?? 0) === 1 ? '' : 'es'}
                        </span>
                      </p>
                      {(group.results?.length ?? 0) === 0 ? (
                        <p className="rounded border border-cf-border bg-cf-bg-200 p-3 text-xs text-cf-text-muted">
                          No matches for this selector.
                        </p>
                      ) : (
                        <table className="w-full border-collapse text-sm">
                          <thead className="sticky top-0 bg-cf-bg-200">
                            <tr className="border-b border-cf-border">
                              <th className="w-12 p-2 text-left text-xs font-medium text-cf-text-muted">#</th>
                              <th className="p-2 text-left text-xs font-medium text-cf-text-muted">Text</th>
                              <th className="w-28 p-2 text-left text-xs font-medium text-cf-text-muted">Size</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.results.slice(0, 50).map((item, j) => (
                              <tr key={j} className="border-b border-cf-border/50 hover:bg-cf-bg-200">
                                <td className="p-2 align-top text-xs text-cf-text-muted">{j + 1}</td>
                                <td className="max-w-[520px] truncate p-2 text-xs text-cf-text">
                                  {item.text?.trim() || <span className="text-cf-text-subtle">(empty)</span>}
                                </td>
                                <td className="p-2 font-mono text-xs text-cf-text-muted">
                                  {item.width != null && item.height != null
                                    ? `${Math.round(item.width)}×${Math.round(item.height)}`
                                    : '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                      {(group.results?.length ?? 0) > 50 && (
                        <p className="p-2 text-xs text-cf-text-muted">
                          Showing first 50 of {group.results.length} matches.
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="dark-surface max-h-[500px] overflow-auto rounded-lg p-4">
                <SyntaxHighlight code={JSON.stringify(groups, null, 2)} language="json" className="text-xs" />
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
