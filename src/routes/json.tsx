import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Sparkles, Database, FileSearch } from 'lucide-react';
import DemoPage from '../components/DemoPage';
import PillButton from '../components/PillButton';
import SyntaxHighlight from '../components/SyntaxHighlight';
import UseCases from '../components/UseCases';
import ResultToolbar from '../components/ResultToolbar';
import { extractJson } from '../server/browser-rendering';

export const Route = createFileRoute('/json')({ component: JsonDemo });

const apiCode = `const resp = await fetch(
  \`https://api.cloudflare.com/client/v4/accounts/\${accountId}/browser-rendering/json\`,
  {
    method: 'POST',
    headers: {
      Authorization: \`Bearer \${apiToken}\`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: 'https://example.com',
      prompt: 'Extract the main heading and all links',
      response_format: {
        type: 'json_schema',
        schema: {
          type: 'object',
          properties: {
            heading: { type: 'string' },
            links: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    }),
  }
);
// Returns: { success: true, result: { ... } }`;

const presets = [
  {
    label: 'Extract headings',
    url: 'https://example.com',
    prompt: 'Extract the main heading and description text from this page',
  },
  {
    label: 'Product info',
    url: 'https://developers.cloudflare.com/browser-rendering/',
    prompt:
      'Extract the product name, description, and list of features or integration methods',
  },
  {
    label: 'News titles',
    url: 'https://news.ycombinator.com',
    prompt: 'Extract the top 5 story titles with their URLs and point counts',
  },
];

function JsonDemo() {
  const [url, setUrl] = useState('');
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [browserMs, setBrowserMs] = useState<string | null>(null);

  const handleRun = async () => {
    if (!url.trim() || !prompt.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setBrowserMs(null);
    try {
      const res = await extractJson({
        data: { url, prompt },
      });
      setResult(res.result);
      setBrowserMs(res.browserMs);
    } catch (e: any) {
      setError(e.message || 'JSON extraction failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DemoPage
      title="AI JSON Extraction"
      description="Use AI (Workers AI) to extract structured JSON data from any webpage. Define your output with a natural language prompt or a JSON schema."
      endpoint="POST /json"
      apiCode={apiCode}
      info="The /json endpoint leverages Workers AI to extract structured data from a webpage. You can specify the expected output using a prompt, a JSON schema via response_format, or both. This is powerful for normalizing unstructured web content into typed JSON for downstream pipelines."
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
              download={{ data: JSON.stringify(result, null, 2), filename: 'json-extract.json', mime: 'application/json' }}
            />
            <div className="bg-cf-code-bg rounded-lg p-4 overflow-auto max-h-[500px]">
              <SyntaxHighlight code={JSON.stringify(result, null, 2)} language="json" className="text-xs" />
            </div>
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
              Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe what data to extract..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-cf-border bg-white text-cf-text placeholder-cf-text-muted focus:outline-none focus:border-cf-orange focus:ring-2 focus:ring-cf-orange/20 transition-all text-sm"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRun}
              disabled={loading || !url.trim() || !prompt.trim()}
              className="px-6 py-3 bg-cf-orange hover:bg-cf-orange-dark text-white font-semibold rounded-xl transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? 'Extracting...' : 'Run'}
            </button>
            <div className="flex flex-wrap gap-2">
              {presets.map((p) => (
                <PillButton
                  key={p.label}
                  label={p.label}
                  onClick={() => {
                    setUrl(p.url);
                    setPrompt(p.prompt);
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
          { icon: <Sparkles size={18} />, title: 'Structured Extraction', description: 'Extract product details, article metadata, or contact information as typed JSON from any page.' },
          { icon: <Database size={18} />, title: 'Data Normalization', description: 'Convert unstructured web content into consistent schemas for databases and APIs.' },
          { icon: <FileSearch size={18} />, title: 'Content Analysis', description: 'Analyze page sentiment, extract topics, or classify content using AI-powered extraction.' },
        ]}
      />
    </DemoPage>
  );
}
