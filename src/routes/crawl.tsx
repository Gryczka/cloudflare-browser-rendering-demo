import { createFileRoute } from '@tanstack/react-router';
import { useState, useRef, useCallback } from 'react';
import DemoPage from '../components/DemoPage';
import StatusBadge from '../components/StatusBadge';
import PillButton from '../components/PillButton';
import CrawlExplorer from '../components/CrawlExplorer';
import { startCrawl, getCrawlStatus } from '../server/browser-rendering';

export const Route = createFileRoute('/crawl')({ component: CrawlDemo });

const apiCode = `// Step 1: Start a crawl job
const startResp = await fetch(
  \`https://api.cloudflare.com/client/v4/accounts/\${accountId}/browser-rendering/crawl\`,
  {
    method: 'POST',
    headers: {
      Authorization: \`Bearer \${apiToken}\`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: 'https://example.com',
      limit: 10,
      depth: 2,
      formats: ['markdown', 'html', 'json'],
      render: true,
      // jsonOptions is required when formats includes 'json'
      jsonOptions: { prompt: 'Extract the title and summary' },
    }),
  }
);
const jobId = (await startResp.json()).result; // returns the job ID string

// Step 2: Poll for results
const statusResp = await fetch(
  \`https://api.cloudflare.com/client/v4/accounts/\${accountId}/browser-rendering/crawl/\${jobId}\`,
  {
    headers: { Authorization: \`Bearer \${apiToken}\` },
  }
);
const { result } = await statusResp.json();
// result.records contains crawled pages with their content`;

const presets = [
  { label: 'example.com', url: 'https://example.com' },
  {
    label: 'CF BR Docs',
    url: 'https://developers.cloudflare.com/browser-rendering/',
  },
  { label: 'blog.cloudflare.com', url: 'https://blog.cloudflare.com/' },
];

function CrawlDemo() {
  const [url, setUrl] = useState('');
  const [limit, setLimit] = useState(10);
  const [depth, setDepth] = useState(2);
  const [formats, setFormats] = useState<string[]>(['markdown', 'html']);
  const [render, setRender] = useState(true);
  const [source, setSource] = useState('all');
  const [includePatterns, setIncludePatterns] = useState('');
  const [excludePatterns, setExcludePatterns] = useState('');
  const [jsonPrompt, setJsonPrompt] = useState('Extract the main heading, description, and a list of links');

  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [jobMeta, setJobMeta] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [browserMs, setBrowserMs] = useState<string | null>(null);
  const [showSkipped, setShowSkipped] = useState(false);
  const [skippedRecords, setSkippedRecords] = useState<any[]>([]);

  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleFormatToggle = (fmt: string) => {
    setFormats((prev) =>
      prev.includes(fmt) ? prev.filter((f) => f !== fmt) : [...prev, fmt]
    );
  };

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearTimeout(pollingRef.current);
      pollingRef.current = null;
    }
    setPolling(false);
  }, []);

  const pollStatus = useCallback(
    async (id: string) => {
      try {
        const res = await getCrawlStatus({ data: { jobId: id } });
        const result = res.result as any;
        const data = result?.result || result;

        setJobMeta(data);
        setBrowserMs(res.browserMs);

        if (data?.records) {
          setRecords(data.records);
        }

        const jobStatus = data?.status || 'unknown';
        setStatus(jobStatus);

        if (
          jobStatus === 'complete' ||
          jobStatus === 'completed' ||
          jobStatus === 'failed'
        ) {
          stopPolling();
          return;
        }

        // Keep polling
        pollingRef.current = setTimeout(() => pollStatus(id), 3000);
      } catch (e: any) {
        setError(e.message);
        stopPolling();
      }
    },
    [stopPolling]
  );

  const handleStart = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setJobId(null);
    setRecords([]);
    setJobMeta(null);
    setStatus(null);
    setBrowserMs(null);
    setSkippedRecords([]);
    setShowSkipped(false);
    stopPolling();

    try {
      const options: Record<string, any> = {};
      if (includePatterns.trim()) {
        options.includePatterns = includePatterns
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean);
      }
      if (excludePatterns.trim()) {
        options.excludePatterns = excludePatterns
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean);
      }

      const res = await startCrawl({
        data: {
          url,
          limit,
          depth,
          formats,
          render,
          source,
          jsonOptions: formats.includes('json') ? { prompt: jsonPrompt } : undefined,
          options: Object.keys(options).length > 0 ? options : undefined,
        },
      });

      const result = res.result as any;
      // The crawl API returns { success: true, result: "job-id-string" }
      // After server fn wrapping: res.result = { success: true, result: "job-id-string" }
      const id =
        typeof result?.result === 'string'
          ? result.result
          : result?.result?.id || result?.id || (typeof result === 'string' ? result : null);
      if (id) {
        setJobId(id);
        setStatus('running');
        setPolling(true);
        setBrowserMs(res.browserMs);
        // Start polling
        pollingRef.current = setTimeout(() => pollStatus(id), 2000);
      } else {
        setError('No job ID returned. Response: ' + JSON.stringify(result));
      }
    } catch (e: any) {
      setError(e.message || 'Crawl start failed');
    } finally {
      setLoading(false);
    }
  };

  const handleShowSkipped = async () => {
    if (!jobId) return;
    try {
      const res = await getCrawlStatus({
        data: { jobId, status: 'skipped' },
      });
      const result = res.result as any;
      const data = result?.result || result;
      setSkippedRecords(data?.records || []);
      setShowSkipped(true);
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <DemoPage
      title="Crawl"
      description="Crawl entire websites with a single API call. Submit a starting URL and automatically discover, render, and return content from multiple pages."
      endpoint="POST /crawl"
      apiCode={apiCode}
      badge="beta"
      info="The /crawl endpoint scrapes content from a starting URL and follows links across the site, up to a configurable depth or page limit. It respects robots.txt and AI Crawl Control by default. Crawl jobs run asynchronously: you submit a URL, receive a job ID, and check back for results. Great for building knowledge bases, RAG pipelines, and content monitoring."
      fullWidthResult={true}
      loading={loading}
      error={error}
      browserMs={browserMs}
      customForm={
        <div className="mb-6 space-y-4">
          {/* URL Input */}
          <div>
            <label className="block text-sm font-medium text-cf-text mb-1">
              Starting URL
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-4 py-3 rounded-xl border border-cf-border bg-white text-cf-text placeholder-cf-text-muted focus:outline-none focus:border-cf-orange focus:ring-2 focus:ring-cf-orange/20 transition-all"
            />
          </div>

          {/* Preset pills */}
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <PillButton
                key={p.label}
                label={p.label}
                onClick={() => setUrl(p.url)}
                active={url === p.url}
              />
            ))}
          </div>

          {/* Configuration Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-cf-text-muted mb-1">
                Page Limit
              </label>
              <input
                type="number"
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                min={1}
                max={100000}
                className="w-full px-3 py-2 rounded-lg border border-cf-border bg-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-cf-text-muted mb-1">
                Depth
              </label>
              <input
                type="number"
                value={depth}
                onChange={(e) => setDepth(Number(e.target.value))}
                min={1}
                max={100000}
                className="w-full px-3 py-2 rounded-lg border border-cf-border bg-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-cf-text-muted mb-1">
                Source
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-cf-border bg-white text-sm"
              >
                <option value="all">All</option>
                <option value="sitemaps">Sitemaps</option>
                <option value="links">Links</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-cf-text-muted mb-1">
                Render JS
              </label>
              <select
                value={render ? 'true' : 'false'}
                onChange={(e) => setRender(e.target.value === 'true')}
                className="w-full px-3 py-2 rounded-lg border border-cf-border bg-white text-sm"
              >
                <option value="true">Yes (headless browser)</option>
                <option value="false">No (fast HTML fetch)</option>
              </select>
            </div>
          </div>

          {/* Formats */}
          <div>
            <label className="block text-xs font-medium text-cf-text-muted mb-2">
              Output Formats
            </label>
            <div className="flex gap-3">
              {['html', 'markdown', 'json'].map((fmt) => (
                <label
                  key={fmt}
                  className="flex items-center gap-2 text-sm cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={formats.includes(fmt)}
                    onChange={() => handleFormatToggle(fmt)}
                    className="rounded accent-cf-orange"
                  />
                  {fmt}
                </label>
              ))}
            </div>
          </div>

          {/* JSON Options (shown when json format is selected) */}
          {formats.includes('json') && (
            <div>
              <label className="block text-xs font-medium text-cf-text-muted mb-1">
                JSON Extraction Prompt
              </label>
              <textarea
                value={jsonPrompt}
                onChange={(e) => setJsonPrompt(e.target.value)}
                placeholder="Describe what data to extract from each page..."
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-cf-border bg-white text-sm focus:outline-none focus:border-cf-orange focus:ring-1 focus:ring-cf-orange/20"
              />
              <p className="text-[10px] text-cf-text-muted mt-1">
                Required when JSON format is selected. Uses Workers AI to extract structured data from each crawled page.
              </p>
            </div>
          )}

          {/* Patterns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-cf-text-muted mb-1">
                Include Patterns (comma-separated)
              </label>
              <input
                type="text"
                value={includePatterns}
                onChange={(e) => setIncludePatterns(e.target.value)}
                placeholder="**/api/v1/*"
                className="w-full px-3 py-2 rounded-lg border border-cf-border bg-white text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-cf-text-muted mb-1">
                Exclude Patterns (comma-separated)
              </label>
              <input
                type="text"
                value={excludePatterns}
                onChange={(e) => setExcludePatterns(e.target.value)}
                placeholder="*/learning-paths/*"
                className="w-full px-3 py-2 rounded-lg border border-cf-border bg-white text-sm font-mono"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleStart}
              disabled={loading || !url.trim()}
              className="px-6 py-3 bg-cf-orange hover:bg-cf-orange-dark text-white font-semibold rounded-xl transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Starting...
                </span>
              ) : (
                'Start Crawl'
              )}
            </button>
            {polling && (
              <button
                onClick={stopPolling}
                className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-cf-text font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Stop Polling
              </button>
            )}
          </div>
        </div>
      }
      resultContent={
        jobId ? (
          <div className="space-y-4">
            {/* Job Status Bar (shown during polling) */}
            {polling && (
              <div className="flex flex-wrap items-center gap-3 pb-3 border-b border-cf-border">
                <StatusBadge
                  status="loading"
                  label={status || 'starting'}
                />
                <span className="text-xs font-mono text-cf-text-muted">
                  Job: {jobId}
                </span>
                <span className="flex items-center gap-1 text-xs text-cf-text-muted">
                  <span className="w-1.5 h-1.5 bg-cf-orange rounded-full pulse-dot" />
                  <span className="pulse-dot-delay-1 w-1.5 h-1.5 bg-cf-orange rounded-full pulse-dot" />
                  <span className="pulse-dot-delay-2 w-1.5 h-1.5 bg-cf-orange rounded-full pulse-dot" />
                  <span className="ml-1">Crawling... {jobMeta?.finished ?? 0}/{jobMeta?.total ?? '?'} pages</span>
                </span>
              </div>
            )}

            {/* Content Explorer (shown when we have records) */}
            {records.length > 0 && (
              <CrawlExplorer
                jobMeta={jobMeta || {}}
                records={records}
                jobId={jobId}
                hasJson={formats.includes('json')}
                onShowSkipped={handleShowSkipped}
                skippedRecords={skippedRecords}
                showSkipped={showSkipped}
              />
            )}
          </div>
        ) : undefined
      }
    />
  );
}
