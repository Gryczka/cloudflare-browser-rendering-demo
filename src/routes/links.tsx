import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Map, Search, ExternalLink } from 'lucide-react';
import DemoPage from '../components/DemoPage';
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
const { result } = await resp.json();
// result: string[] — absolute URLs found on the page`;

const pills = [
  { label: 'example.com', value: 'https://example.com' },
  { label: 'cloudflare.com', value: 'https://cloudflare.com' },
  { label: 'news.ycombinator.com', value: 'https://news.ycombinator.com' },
];

const MAX_ROWS = 200;

function LinksDemo() {
  const [links, setLinks] = useState<Array<string> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [browserMs, setBrowserMs] = useState<number | null>(null);
  const [filter, setFilter] = useState('');

  const handleRun = async (url: string) => {
    setLoading(true);
    setError(null);
    setLinks(null);
    setBrowserMs(null);
    setFilter('');
    try {
      const res = await fetchLinks({ data: { url } });
      setLinks(res.result);
      setBrowserMs(res.browserMs);
    } catch (e: any) {
      setError(e.message || 'Links fetch failed');
    } finally {
      setLoading(false);
    }
  };

  const needle = filter.trim().toLowerCase();
  const visible = (links ?? []).filter((link) =>
    needle ? link.toLowerCase().includes(needle) : true
  );

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
        links ? (
          <div>
            <ResultToolbar
              browserMs={browserMs}
              contentSize={links.join('\n').length}
              contentLabel="links"
              copyContent={links.join('\n')}
              download={{
                data: links.join('\n'),
                filename: 'links.txt',
                mime: 'text/plain',
              }}
            />

            <div className="flex items-center gap-3 my-3">
              <input
                type="search"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter links..."
                className="input-field flex-1 py-2 text-sm"
              />
              <p className="shrink-0 text-sm text-cf-text-muted">
                {needle
                  ? `${visible.length} of ${links.length}`
                  : `${links.length} links`}
              </p>
            </div>

            {visible.length === 0 ? (
              <p className="rounded-lg border border-cf-border bg-cf-bg-200 p-4 text-sm text-cf-text-muted">
                {links.length === 0
                  ? 'No links found on this page.'
                  : 'No links match that filter.'}
              </p>
            ) : (
              <div className="max-h-[500px] overflow-auto rounded-lg border border-cf-border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-cf-bg-200">
                    <tr className="border-b border-cf-border">
                      <th className="w-12 p-2 text-left font-medium text-cf-text-muted">
                        #
                      </th>
                      <th className="p-2 text-left font-medium text-cf-text-muted">
                        URL
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.slice(0, MAX_ROWS).map((link, i) => (
                      <tr
                        key={`${link}-${i}`}
                        className="border-b border-cf-border/50 hover:bg-cf-bg-200"
                      >
                        <td className="p-2 align-top text-cf-text-muted">
                          {i + 1}
                        </td>
                        <td className="p-2">
                          <a
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block break-all font-mono text-xs text-cf-orange hover:underline"
                          >
                            {link}
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {visible.length > MAX_ROWS && (
                  <p className="p-2 text-xs text-cf-text-muted">
                    Showing first {MAX_ROWS} of {visible.length} matching links.
                    Use Download for the full list.
                  </p>
                )}
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
