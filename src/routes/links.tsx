import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Map, Search, ExternalLink } from 'lucide-react';
import DemoPage from '../components/DemoPage';
import SyntaxHighlight from '../components/SyntaxHighlight';
import UseCases from '../components/UseCases';
import ResultToolbar from '../components/ResultToolbar';
import { fetchLinks } from '../server/browser-rendering';

export const Route = createFileRoute('/links')({ component: LinksDemo });

const apiCode = `const resp = await fetch(
  \`https://api.cloudflare.com/client/v4/accounts/\${accountId}/browser-rendering/links\`,
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
// Returns: { links: [{ href, text, ... }] }`;

const pills = [
  { label: 'example.com', value: 'https://example.com' },
  { label: 'cloudflare.com', value: 'https://cloudflare.com' },
  { label: 'news.ycombinator.com', value: 'https://news.ycombinator.com' },
];

function LinksDemo() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [browserMs, setBrowserMs] = useState<string | null>(null);

  const handleRun = async (url: string) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setBrowserMs(null);
    try {
      const res = await fetchLinks({ data: { url } });
      setResult(res.result);
      setBrowserMs(res.browserMs);
    } catch (e: any) {
      setError(e.message || 'Links fetch failed');
    } finally {
      setLoading(false);
    }
  };

  const links = result?.links || result?.result?.links || [];

  return (
    <DemoPage
      title="Link Discovery"
      description="Retrieve all links from a webpage. Useful for site mapping, SEO analysis, content discovery, and building crawl queues."
      endpoint="POST /links"
      apiCode={apiCode}
      pills={pills}
      info="The /links endpoint extracts all hyperlinks from a webpage after JavaScript rendering. Returns link text, href, and other attributes for each link found."
      onRun={handleRun}
      loading={loading}
      error={error}
      resultContent={
        result ? (
          <div>
            {Array.isArray(links) && links.length > 0 ? (
              <div>
                <div className="flex items-center gap-4 mb-3">
                  <ResultToolbar
                    browserMs={browserMs}
                    contentSize={JSON.stringify(result).length}
                    contentLabel="JSON"
                    copyContent={JSON.stringify(links, null, 2)}
                    download={{ data: links.map((l: any) => `${l.text || ''}\t${l.href || ''}`).join('\n'), filename: 'links.tsv', mime: 'text/tab-separated-values' }}
                  />
                </div>
                <p className="text-sm text-cf-text-muted mb-3">
                  {links.length} links found
                </p>
                <div className="max-h-[500px] overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-gray-50">
                      <tr className="border-b border-cf-border">
                        <th className="text-left p-2 text-cf-text-muted font-medium">
                          #
                        </th>
                        <th className="text-left p-2 text-cf-text-muted font-medium">
                          Text
                        </th>
                        <th className="text-left p-2 text-cf-text-muted font-medium">
                          URL
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {links.slice(0, 100).map((link: any, i: number) => (
                        <tr
                          key={i}
                          className="border-b border-cf-border/50 hover:bg-gray-50"
                        >
                          <td className="p-2 text-cf-text-muted">{i + 1}</td>
                          <td className="p-2 text-cf-text max-w-[200px] truncate">
                            {link.text || '-'}
                          </td>
                          <td className="p-2">
                            <a
                              href={link.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-cf-orange hover:underline font-mono text-xs max-w-[400px] truncate block"
                            >
                              {link.href}
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {links.length > 100 && (
                    <p className="text-xs text-cf-text-muted p-2">
                      Showing first 100 of {links.length} links
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-cf-code-bg rounded-lg p-4 overflow-auto max-h-[500px]">
                <SyntaxHighlight code={JSON.stringify(result, null, 2)} language="json" className="text-xs" />
              </div>
            )}
          </div>
        ) : undefined
      }
    >
      <UseCases
        cases={[
          { icon: <Map size={18} />, title: 'Site Mapping', description: 'Discover all pages on a website to build sitemaps or feed into a crawl pipeline.' },
          { icon: <Search size={18} />, title: 'SEO Analysis', description: 'Audit outbound links, find broken references, and analyze internal link structure.' },
          { icon: <ExternalLink size={18} />, title: 'Content Discovery', description: 'Find related pages, resources, and references linked from any webpage.' },
        ]}
      />
    </DemoPage>
  );
}
