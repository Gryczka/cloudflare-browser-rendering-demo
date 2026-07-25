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
      // Optional. Note json_schema holds the bare schema — not OpenAI's
      // { name, schema, strict } wrapper.
      response_format: {
        type: 'json_schema',
        json_schema: {
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
const { result } = await resp.json();
// result is the extracted object, conforming to the schema when one is given.
// Defaults to Workers AI @cf/meta/llama-3.3-70b-instruct-fp8-fast,
// which bills against your Workers AI usage.`;

const presets = [
  {
    label: 'Extract headings',
    url: 'https://example.com',
    prompt: 'Extract the main heading and description text from this page',
    schema: '',
  },
  {
    label: 'Product info',
    url: 'https://developers.cloudflare.com/browser-run/',
    prompt:
      'Extract the product name, description, and list of features or integration methods',
    schema: '',
  },
  {
    label: 'News titles + schema',
    url: 'https://news.ycombinator.com',
    prompt: 'Extract the top 5 story titles with their URLs and point counts',
    schema: JSON.stringify(
      {
        type: 'object',
        properties: {
          stories: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                url: { type: 'string' },
                points: { type: 'number' },
              },
              required: ['title'],
            },
          },
        },
      },
      null,
      2
    ),
  },
];

function JsonDemo() {
  const [url, setUrl] = useState('');
  const [prompt, setPrompt] = useState('');
  const [schemaText, setSchemaText] = useState('');
  const [useSchema, setUseSchema] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [browserMs, setBrowserMs] = useState<number | null>(null);

  // Validate the schema as the user types so Run can be blocked before a
  // round-trip, rather than surfacing a 400 from the API.
  let schemaError: string | null = null;
  let parsedSchema: Record<string, unknown> | null = null;
  if (useSchema && schemaText.trim()) {
    try {
      const parsed = JSON.parse(schemaText);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        schemaError = 'Schema must be a JSON object.';
      } else {
        parsedSchema = parsed;
      }
    } catch (e: any) {
      schemaError = `Invalid JSON: ${e.message}`;
    }
  }

  // The endpoint needs a prompt, a schema, or both.
  const canRun =
    !!url.trim() &&
    (!!prompt.trim() || !!parsedSchema) &&
    !schemaError &&
    !loading;

  const handleRun = async () => {
    if (!canRun) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setBrowserMs(null);
    try {
      const res = await extractJson({
        data: {
          url,
          prompt: prompt.trim() || undefined,
          response_format: parsedSchema
            ? { type: 'json_schema', json_schema: parsedSchema }
            : undefined,
        },
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
            <div className="dark-surface max-h-[500px] overflow-auto rounded-lg p-4">
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
              className="w-full px-4 py-3 rounded-xl border border-cf-border bg-cf-bg-200 text-cf-text placeholder-cf-text-muted focus:outline-none focus:border-cf-orange focus:ring-2 focus:ring-cf-orange/20 transition-all"
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
              className="w-full px-4 py-3 rounded-xl border border-cf-border bg-cf-bg-200 text-cf-text placeholder-cf-text-muted focus:outline-none focus:border-cf-orange focus:ring-2 focus:ring-cf-orange/20 transition-all text-sm"
            />
          </div>

          <div>
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-cf-text">
              <input
                type="checkbox"
                checked={useSchema}
                onChange={(e) => setUseSchema(e.target.checked)}
                className="accent-cf-orange"
              />
              Constrain output with a JSON Schema
              <span className="font-mono text-xs text-cf-text-subtle">
                response_format
              </span>
            </label>

            {useSchema && (
              <div className="mt-2">
                <textarea
                  value={schemaText}
                  onChange={(e) => setSchemaText(e.target.value)}
                  placeholder={'{\n  "type": "object",\n  "properties": { "title": { "type": "string" } }\n}'}
                  rows={9}
                  spellCheck={false}
                  className={`w-full rounded-xl border bg-cf-bg-200 px-4 py-3 font-mono text-xs text-cf-text transition-all placeholder-cf-text-subtle focus:ring-2 focus:ring-cf-orange/20 focus:outline-none ${schemaError ? 'border-cf-error' : 'border-cf-border focus:border-cf-orange'}`}
                />
                {schemaError ? (
                  <p className="mt-1 text-xs text-cf-error">{schemaError}</p>
                ) : (
                  <p className="mt-1 text-xs text-cf-text-subtle">
                    Sent as{' '}
                    <span className="font-mono">
                      response_format.json_schema
                    </span>{' '}
                    — the bare schema, not OpenAI&rsquo;s{' '}
                    <span className="font-mono">
                      {'{ name, schema, strict }'}
                    </span>{' '}
                    wrapper.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRun}
              disabled={!canRun}
              className="btn-base btn-primary"
            >
              {loading ? 'Extracting...' : 'Run'}
            </button>
            <div className="flex flex-wrap gap-2">
              {presets.map((p) => (
                <PillButton
                  key={p.label}
                  label={p.label}
                  active={url === p.url && prompt === p.prompt}
                  onClick={() => {
                    setUrl(p.url);
                    setPrompt(p.prompt);
                    setSchemaText(p.schema);
                    setUseSchema(!!p.schema);
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
