import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Monitor, Shield, Clock } from 'lucide-react';
import DemoPage from '../components/DemoPage';
import SyntaxHighlight from '../components/SyntaxHighlight';
import UseCases from '../components/UseCases';
import ResultToolbar from '../components/ResultToolbar';
import { takeSnapshot } from '../server/browser-rendering';

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
    }),
  }
);
// Returns: { screenshot: base64, content: html }`;

const pills = [
  { label: 'example.com', value: 'https://example.com' },
  { label: 'cloudflare.com', value: 'https://cloudflare.com' },
  {
    label: 'developers.cloudflare.com',
    value: 'https://developers.cloudflare.com',
  },
];

function SnapshotDemo() {
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [browserMs, setBrowserMs] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'screenshot' | 'html' | 'preview'>(
    'screenshot'
  );

  const handleRun = async (url: string) => {
    setLoading(true);
    setError(null);
    setScreenshot(null);
    setHtml(null);
    setBrowserMs(null);
    try {
      const result = await takeSnapshot({ data: { url } });
      setScreenshot(result.screenshot);
      setHtml(result.html);
      setBrowserMs(result.browserMs);
    } catch (e: any) {
      setError(e.message || 'Snapshot failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DemoPage
      title="Snapshot"
      description="Capture both the rendered HTML and a screenshot of a page in a single API call. Two outputs, one request."
      endpoint="POST /snapshot"
      apiCode={apiCode}
      pills={pills}
      info="The /snapshot endpoint captures both the page's HTML content and a screenshot in one request, reducing API calls when you need both outputs. Perfect for archiving, monitoring, or visual testing."
      onRun={handleRun}
      loading={loading}
      error={error}
      resultContent={
        screenshot || html ? (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => setActiveTab('screenshot')}
                className={`px-3 py-1 text-sm rounded-lg cursor-pointer transition-colors ${activeTab === 'screenshot' ? 'bg-cf-orange text-white' : 'bg-gray-100 text-cf-text'}`}
              >
                Screenshot
              </button>
              <button
                onClick={() => setActiveTab('html')}
                className={`px-3 py-1 text-sm rounded-lg cursor-pointer transition-colors ${activeTab === 'html' ? 'bg-cf-orange text-white' : 'bg-gray-100 text-cf-text'}`}
              >
                HTML ({html ? html.length.toLocaleString() : 0} chars)
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1 text-sm rounded-lg cursor-pointer transition-colors ${activeTab === 'preview' ? 'bg-cf-orange text-white' : 'bg-gray-100 text-cf-text'}`}
              >
                HTML Preview
              </button>
            </div>
            <div className="mb-3">
              <ResultToolbar
                browserMs={browserMs}
                contentSize={activeTab === 'screenshot' && screenshot ? Math.round((screenshot.length * 3) / 4) : html?.length}
                contentLabel={activeTab === 'screenshot' ? 'PNG' : 'HTML'}
                copyContent={activeTab === 'html' ? html ?? undefined : undefined}
                download={activeTab === 'screenshot' && screenshot ? { data: screenshot, filename: 'snapshot.png', mime: 'image/png' } : activeTab === 'html' && html ? { data: html, filename: 'snapshot.html', mime: 'text/html' } : undefined}
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
                className="w-full h-[500px] rounded-lg border border-cf-border bg-white"
              />
            ) : (
              html && (
                <div className="bg-cf-code-bg rounded-lg p-4 overflow-auto max-h-[500px]">
                  <SyntaxHighlight code={html} language="html" className="text-xs" />
                </div>
              )
            )}
          </div>
        ) : undefined
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
