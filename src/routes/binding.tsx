import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { KeyRound, Network, Gauge } from 'lucide-react';
import DemoPage from '../components/DemoPage';
import PillButton from '../components/PillButton';
import UseCases from '../components/UseCases';
import { Callout } from '../components/Callout';
import CodeBlock from '../components/CodeBlock';
import { compareBindingAndRest } from '../server/browser-rendering';

export const Route = createFileRoute('/binding')({ component: BindingDemo });

const REST_CODE = `// Needs CF_ACCOUNT_ID + CF_API_TOKEN as secrets, and the
// request leaves Cloudflare's network and comes back.
const resp = await fetch(
  \`https://api.cloudflare.com/client/v4/accounts/\${accountId}/browser-rendering/markdown\`,
  {
    method: 'POST',
    headers: {
      Authorization: \`Bearer \${apiToken}\`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url }),
  }
);
const { result } = await resp.json();`;

const BINDING_CODE = `// No account id, no token, no external hop.
const resp = await env.BROWSER.quickAction('markdown', { url });
const { result } = await resp.json();`;

const CONFIG_CODE = `{
  // 2026-03-24 or later is required by quickAction()
  "compatibility_date": "2026-03-24",
  "browser": {
    "binding": "BROWSER",
    // Required for local dev: quickAction() is not implemented by the
    // local runtime. Without it you get
    //   The RPC receiver does not implement the method "quickAction"
    "remote": true
  }
}`;

const pills = [
  { label: 'example.com', value: 'https://example.com' },
  { label: 'cloudflare.com', value: 'https://www.cloudflare.com' },
  { label: 'blog.cloudflare.com', value: 'https://blog.cloudflare.com' },
];

type Outcome = {
  markdown: string | null;
  browserMs: number | null;
  wallMs: number;
  error: string | null;
};

function BindingDemo() {
  const [url, setUrl] = useState('');
  const [rest, setRest] = useState<Outcome | null>(null);
  const [binding, setBinding] = useState<Outcome | null>(null);
  const [identical, setIdentical] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRun = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setRest(null);
    setBinding(null);
    setIdentical(null);
    try {
      const res = await compareBindingAndRest({ data: { url } });
      setRest(res.rest);
      setBinding(res.binding);
      setIdentical(res.identical);
    } catch (e: any) {
      setError(e.message || 'Comparison failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DemoPage
      title="Binding vs REST"
      description="The same Quick Action called two ways: over the REST API with a bearer token, and directly through the Workers browser binding. Same result, materially less setup."
      endpoint="env.BROWSER.quickAction() vs POST /markdown"
      apiCode={CONFIG_CODE}
      badge="new"
      info="Both paths hit the same service and return the same envelope. The binding removes the API token, the account id, and the outbound HTTP request. Treat the timings as illustrative rather than a benchmark — see the note below the results."
      loading={loading}
      error={error}
      fullWidthResult
      resultContent={
        rest && binding ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <OutcomeCard title="REST API" subtitle="+ bearer token" outcome={rest} />
              <OutcomeCard
                title="env.BROWSER.quickAction()"
                subtitle="no token"
                outcome={binding}
              />
            </div>

            {identical !== null && !rest.error && !binding.error && (
              <Callout>
                {identical
                  ? 'Both paths returned byte-identical Markdown.'
                  : 'The two payloads differ. That is expected on pages whose content changes between renders — ads, timestamps, or randomised content.'}
              </Callout>
            )}

            <Callout variant="ai">
              <strong className="text-cf-text">
                Do not read the timings as a benchmark.
              </strong>{' '}
              Browser time is whatever the render happened to cost and varies
              per run. Wall time is even less comparable: in local development
              the binding requires{' '}
              <code className="font-mono">remote: true</code>, which tunnels the
              call from your machine to Cloudflare and back, so the binding
              often looks <em>slower</em> locally than the plain REST call. In a
              deployed Worker that tunnel does not exist and the binding is the
              shorter path. The real argument for the binding is the removed
              credential and the removed external hop, not latency.
            </Callout>
          </div>
        ) : undefined
      }
      customForm={
        <div className="mb-4 space-y-3">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <CodeBlock code={REST_CODE} language="javascript" title="REST API" />
            <CodeBlock
              code={BINDING_CODE}
              language="javascript"
              title="Workers binding"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-cf-text">
              URL
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRun()}
              placeholder="Enter a URL..."
              className="input-field"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRun}
              disabled={loading || !url.trim()}
              className="btn-base btn-primary"
            >
              {loading ? 'Running both...' : 'Run both'}
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

          <p className="text-xs text-cf-text-subtle">
            Runs sequentially, not in parallel — two concurrent renders of the
            same URL would double the billed browser time for no extra insight.
          </p>
        </div>
      }
    >
      <UseCases
        cases={[
          {
            icon: <KeyRound size={18} />,
            title: 'No Credential to Manage',
            description:
              'The binding authenticates implicitly. There is no API token to provision, rotate, scope, or accidentally commit.',
          },
          {
            icon: <Network size={18} />,
            title: 'No External Hop',
            description:
              'The Worker talks to Browser Run over Cloudflare\u2019s own network instead of making an outbound HTTPS request to the public API.',
          },
          {
            icon: <Gauge size={18} />,
            title: 'Same Surface',
            description:
              'Eight of the Quick Actions are available on the binding. /crawl stays REST-only, and it is the one place you still need a token.',
          },
        ]}
      />

      <Callout variant="ai">
        <strong className="text-cf-text">Types lag the docs here.</strong> The
        shipped <code className="font-mono">BrowserRun</code> type declares eight
        actions and does not yet include{' '}
        <code className="font-mono">accessibilityTree</code>, nor{' '}
        <code className="font-mono">formats</code> on the snapshot options — both
        of which the REST API accepts today. Until the types catch up, reach for
        those two over REST.
      </Callout>
    </DemoPage>
  );
}

function OutcomeCard({
  title,
  subtitle,
  outcome,
}: {
  title: string;
  subtitle: string;
  outcome: Outcome;
}) {
  return (
    <div className="rounded-lg border border-cf-border bg-cf-bg-200 p-4">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h3 className="font-mono text-sm font-medium text-cf-text">{title}</h3>
        <span className="font-mono text-xs text-cf-text-subtle">{subtitle}</span>
      </div>

      {outcome.error ? (
        <p className="rounded border border-cf-error/30 bg-cf-error/5 p-3 text-xs text-cf-error">
          {outcome.error}
        </p>
      ) : (
        <>
          <dl className="mb-3 grid grid-cols-2 gap-2 text-xs">
            <div>
              <dt className="text-cf-text-subtle">Browser time</dt>
              <dd className="font-mono text-cf-text">
                {outcome.browserMs != null ? `${outcome.browserMs} ms` : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-cf-text-subtle">Server wall time</dt>
              <dd className="font-mono text-cf-text">{outcome.wallMs} ms</dd>
            </div>
          </dl>
          <pre className="dark-surface max-h-56 overflow-auto rounded p-3 font-mono text-xs whitespace-pre-wrap">
            {outcome.markdown?.slice(0, 1500) ?? ''}
          </pre>
        </>
      )}
    </div>
  );
}
