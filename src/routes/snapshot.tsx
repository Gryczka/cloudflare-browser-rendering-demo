import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Monitor, Shield, Clock } from 'lucide-react';
import DemoPage from '../components/DemoPage';
import PillButton from '../components/PillButton';
import SyntaxHighlight from '../components/SyntaxHighlight';
import UseCases from '../components/UseCases';
import ResultToolbar from '../components/ResultToolbar';
import AccessibilityTreeView from '../components/AccessibilityTreeView';
import {
  takeSnapshot,
  type SnapshotFormat,
  type AccessibilityNode,
} from '../server/browser-rendering';

export const Route = createFileRoute('/snapshot')({
  component: SnapshotDemo,
});

const apiCode = `const resp = await fetch(
  \`https://api.cloudflare.com/client/v4/accounts/\${accountId}/browser-rendering/snapshot\`,
  {
    method: 'POST',
    headers: {
      Authorization: \`Bearer \${apiToken}\`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: 'https://example.com',
      // At least two formats are required. For one, use its own endpoint.
      formats: ['screenshot', 'markdown', 'accessibilityTree'],
    }),
  }
);
const { result } = await resp.json();
// Only the requested keys come back:
// { screenshot: 'iVBORw0KGgo...', markdown: '# ...', accessibilityTree: {...} }
// Defaults to ['content', 'screenshot'] when formats is omitted.`;

const pills = [
  { label: 'example.com', value: 'https://example.com' },
  { label: 'cloudflare.com', value: 'https://cloudflare.com' },
  {
    label: 'developers.cloudflare.com',
    value: 'https://developers.cloudflare.com',
  },
];

type Tab = 'screenshot' | 'html' | 'preview' | 'markdown' | 'a11y';

const FORMAT_OPTIONS: Array<{ value: SnapshotFormat; label: string }> = [
  { value: 'screenshot', label: 'screenshot' },
  { value: 'content', label: 'content (HTML)' },
  { value: 'markdown', label: 'markdown' },
  { value: 'accessibilityTree', label: 'accessibilityTree' },
];

/** Payload slices available to the result toolbar. */
interface Slices {
  screenshot?: string | null;
  html?: string | null;
  markdown?: string | null;
  tree?: AccessibilityNode | null;
}

function activeTabLabel(tab: Tab): string {
  if (tab === 'screenshot') return 'PNG';
  if (tab === 'markdown') return 'markdown';
  if (tab === 'a11y') return 'JSON';
  return 'HTML';
}

function activeTabSize(tab: Tab, s: Slices): number | undefined {
  // base64 inflates by ~4/3, so approximate the decoded byte count.
  if (tab === 'screenshot') {
    return s.screenshot ? Math.round((s.screenshot.length * 3) / 4) : undefined;
  }
  if (tab === 'markdown') return s.markdown?.length;
  if (tab === 'a11y') return s.tree ? JSON.stringify(s.tree).length : undefined;
  return s.html?.length;
}

function activeTabCopy(tab: Tab, s: Slices): string | undefined {
  if (tab === 'markdown') return s.markdown ?? undefined;
  if (tab === 'a11y') return s.tree ? JSON.stringify(s.tree, null, 2) : undefined;
  if (tab === 'html') return s.html ?? undefined;
  return undefined;
}

function activeTabDownload(tab: Tab, s: Slices) {
  if (tab === 'screenshot' && s.screenshot) {
    return { data: s.screenshot, filename: 'snapshot.png', mime: 'image/png' };
  }
  if (tab === 'markdown' && s.markdown) {
    return { data: s.markdown, filename: 'snapshot.md', mime: 'text/markdown' };
  }
  if (tab === 'a11y' && s.tree) {
    return {
      data: JSON.stringify(s.tree, null, 2),
      filename: 'snapshot-a11y.json',
      mime: 'application/json',
    };
  }
  if (tab === 'html' && s.html) {
    return { data: s.html, filename: 'snapshot.html', mime: 'text/html' };
  }
  return undefined;
}

function SnapshotDemo() {
  const [url, setUrl] = useState('');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [tree, setTree] = useState<AccessibilityNode | null>(null);
  const [formats, setFormats] = useState<Array<SnapshotFormat>>([
    'screenshot',
    'markdown',
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [browserMs, setBrowserMs] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('screenshot');

  const toggleFormat = (value: SnapshotFormat) => {
    setFormats((prev) =>
      prev.includes(value) ? prev.filter((f) => f !== value) : [...prev, value]
    );
  };

  const handleRun = async (url: string) => {
    setLoading(true);
    setError(null);
    setScreenshot(null);
    setHtml(null);
    setMarkdown(null);
    setTree(null);
    setBrowserMs(null);
    try {
      const result = await takeSnapshot({ data: { url, formats } });
      setScreenshot(result.screenshot);
      setHtml(result.html);
      setMarkdown(result.markdown);
      setTree(result.accessibilityTree);
      setBrowserMs(result.browserMs);

      // Land on a tab that actually has content.
      const firstAvailable: Tab | undefined = result.screenshot
        ? 'screenshot'
        : result.markdown
          ? 'markdown'
          : result.html
            ? 'html'
            : result.accessibilityTree
              ? 'a11y'
              : undefined;
      if (firstAvailable) setActiveTab(firstAvailable);
    } catch (e: any) {
      setError(e.message || 'Snapshot failed');
    } finally {
      setLoading(false);
    }
  };

  const tooFewFormats = formats.length < 2;

  return (
    <DemoPage
      title="Snapshot"
      description="Capture several representations of a page in one request — screenshot, rendered HTML, Markdown, and the accessibility tree. One render, multiple outputs."
      endpoint="POST /snapshot"
      apiCode={apiCode}
      info="The /snapshot endpoint captures several representations of a page in one request, so you pay for one render instead of several. Markdown and the accessibility tree are the token-efficient pair for feeding an LLM; content plus screenshot is the archival pair."
      loading={loading}
      error={error}
      resultContent={
        screenshot || html || markdown || tree ? (
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {(
                [
                  ['screenshot', 'Screenshot', !!screenshot],
                  ['markdown', 'Markdown', !!markdown],
                  ['html', `HTML (${html ? html.length.toLocaleString() : 0} chars)`, !!html],
                  ['preview', 'HTML Preview', !!html],
                  ['a11y', 'A11y Tree', !!tree],
                ] as Array<[Tab, string, boolean]>
              )
                .filter(([, , available]) => available)
                .map(([tab, label]) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`cursor-pointer rounded-lg px-3 py-1 text-sm transition-colors ${activeTab === tab ? 'bg-cf-orange text-cf-on-orange' : 'bg-cf-bg-300 text-cf-text'}`}
                  >
                    {label}
                  </button>
                ))}
            </div>
            <div className="mb-3">
              <ResultToolbar
                browserMs={browserMs}
                contentSize={activeTabSize(activeTab, { screenshot, html, markdown, tree })}
                contentLabel={activeTabLabel(activeTab)}
                copyContent={activeTabCopy(activeTab, { html, markdown, tree })}
                download={activeTabDownload(activeTab, { screenshot, html, markdown, tree })}
              />
            </div>

            {activeTab === 'screenshot' && screenshot ? (
              <img
                src={screenshot}
                alt="Snapshot screenshot"
                className="max-w-full rounded-lg border border-cf-border"
              />
            ) : activeTab === 'preview' && html ? (
              <iframe
                srcDoc={html}
                sandbox="allow-same-origin"
                title="HTML Preview"
                className="h-[500px] w-full rounded-lg border border-cf-border bg-white"
              />
            ) : activeTab === 'markdown' && markdown ? (
              <pre className="dark-surface max-h-[500px] overflow-auto rounded-lg p-4 font-mono text-sm whitespace-pre-wrap">
                {markdown}
              </pre>
            ) : activeTab === 'a11y' && tree ? (
              <div className="dark-surface max-h-[500px] overflow-auto rounded-lg p-4">
                <AccessibilityTreeView node={tree} />
              </div>
            ) : (
              html && (
                <div className="dark-surface max-h-[500px] overflow-auto rounded-lg p-4">
                  <SyntaxHighlight code={html} language="html" className="text-xs" />
                </div>
              )
            )}
          </div>
        ) : undefined
      }
      customForm={
        <div className="mb-4 space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-cf-text">
              URL
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !tooFewFormats && handleRun(url)}
              placeholder="Enter a URL..."
              className="input-field"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-cf-text">
              Formats{' '}
              <span className="text-cf-text-subtle">
                (at least two — for one, use its own endpoint)
              </span>
            </label>
            <div className="flex flex-wrap gap-3">
              {FORMAT_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-center gap-1.5 font-mono text-sm text-cf-text"
                >
                  <input
                    type="checkbox"
                    checked={formats.includes(option.value)}
                    onChange={() => toggleFormat(option.value)}
                    className="accent-cf-orange"
                  />
                  {option.label}
                </label>
              ))}
            </div>
            {tooFewFormats && (
              <p className="mt-1.5 text-xs text-cf-error">
                Select at least two formats.
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleRun(url)}
              disabled={loading || !url.trim() || tooFewFormats}
              className="btn-base btn-primary"
            >
              {loading ? 'Capturing...' : 'Run'}
            </button>
            <div className="flex flex-wrap gap-2">
              {pills.map((p) => (
                <PillButton
                  key={p.label}
                  label={p.label}
                  active={url === p.value}
                  onClick={() => setUrl(p.value)}
                />
              ))}
            </div>
          </div>
        </div>
      }
    >
      <UseCases
        cases={[
          { icon: <Monitor size={18} />, title: 'Visual + Content Monitoring', description: 'Capture both the appearance and full DOM of a page in a single API call for change detection.' },
          { icon: <Shield size={18} />, title: 'Compliance Archival', description: 'Store complete page evidence with both visual proof and HTML source for regulatory compliance.' },
          { icon: <Clock size={18} />, title: 'Performance Baseline', description: 'Record page state before and after changes to compare rendering and content differences.' },
        ]}
      />
    </DemoPage>
  );
}
