import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Bot, Accessibility, Crosshair } from 'lucide-react';
import DemoPage from '../components/DemoPage';
import PillButton from '../components/PillButton';
import SyntaxHighlight from '../components/SyntaxHighlight';
import UseCases from '../components/UseCases';
import ResultToolbar from '../components/ResultToolbar';
import { Callout } from '../components/Callout';
import AccessibilityTreeView, {
  countNodes,
} from '../components/AccessibilityTreeView';
import {
  fetchAccessibilityTree,
  type AccessibilityNode,
} from '../server/browser-rendering';

export const Route = createFileRoute('/accessibility')({
  component: AccessibilityDemo,
});

const apiCode = `const resp = await fetch(
  \`https://api.cloudflare.com/client/v4/accounts/\${accountId}/browser-rendering/accessibilityTree\`,
  {
    method: 'POST',
    headers: {
      Authorization: \`Bearer \${apiToken}\`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: 'https://example.com',
      interestingOnly: true,   // semantically meaningful nodes only (default)
      root: 'main',            // optional: anchor to a subtree
    }),
  }
);
const { result } = await resp.json();
// result.accessibilityTree — { role, name, level?, children[] }
// A root selector that matches nothing returns 200 with a null tree.`;

const presets = [
  { label: 'example.com', url: 'https://example.com', root: '' },
  { label: 'cloudflare.com', url: 'https://www.cloudflare.com', root: '' },
  {
    label: 'CF docs nav',
    url: 'https://developers.cloudflare.com/browser-run/',
    root: 'nav',
  },
];

function AccessibilityDemo() {
  const [url, setUrl] = useState('');
  const [root, setRoot] = useState('');
  const [interestingOnly, setInterestingOnly] = useState(true);
  const [tree, setTree] = useState<AccessibilityNode | null>(null);
  const [ran, setRan] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [browserMs, setBrowserMs] = useState<number | null>(null);
  const [view, setView] = useState<'tree' | 'json'>('tree');

  const handleRun = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setTree(null);
    setRan(false);
    setBrowserMs(null);
    try {
      const res = await fetchAccessibilityTree({
        data: { url, interestingOnly, root: root || undefined },
      });
      setTree(res.tree);
      setBrowserMs(res.browserMs);
      setRan(true);
    } catch (e: any) {
      setError(e.message || 'Accessibility tree request failed');
    } finally {
      setLoading(false);
    }
  };

  const json = tree ? JSON.stringify(tree, null, 2) : '';

  return (
    <DemoPage
      title="Accessibility Tree"
      description="Capture Chrome's accessibility tree — roles, names, values, and hierarchy. A structural view of the page for AI agents, without parsing HTML."
      endpoint="POST /accessibilityTree"
      apiCode={apiCode}
      badge="new"
      info="The /accessibilityTree endpoint returns the same semantic tree a screen reader consumes. For agents it is dramatically more token-efficient than raw HTML and far more stable than CSS selectors, because it describes what elements *are* rather than how they are marked up."
      loading={loading}
      error={error}
      resultContent={
        ran ? (
          <div>
            {tree ? (
              <>
                <ResultToolbar
                  browserMs={browserMs}
                  contentSize={json.length}
                  contentLabel="JSON"
                  copyContent={json}
                  download={{
                    data: json,
                    filename: 'accessibility-tree.json',
                    mime: 'application/json',
                  }}
                />
                <div className="my-3 flex items-center gap-2">
                  <button
                    onClick={() => setView('tree')}
                    className={`cursor-pointer rounded-lg px-3 py-1 text-sm transition-colors ${view === 'tree' ? 'bg-cf-orange text-cf-on-orange' : 'bg-cf-bg-300 text-cf-text'}`}
                  >
                    Tree
                  </button>
                  <button
                    onClick={() => setView('json')}
                    className={`cursor-pointer rounded-lg px-3 py-1 text-sm transition-colors ${view === 'json' ? 'bg-cf-orange text-cf-on-orange' : 'bg-cf-bg-300 text-cf-text'}`}
                  >
                    JSON
                  </button>
                  <p className="ml-1 text-sm text-cf-text-muted">
                    {countNodes(tree)} nodes
                  </p>
                </div>
                <div className="dark-surface max-h-[500px] overflow-auto rounded-lg p-4">
                  {view === 'tree' ? (
                    <AccessibilityTreeView node={tree} />
                  ) : (
                    <SyntaxHighlight code={json} language="json" className="text-xs" />
                  )}
                </div>
              </>
            ) : (
              <Callout>
                The request succeeded but returned an empty tree. That happens
                when a <code className="font-mono">root</code> selector matches
                no element on the page — the API responds <code>200</code> with{' '}
                <code className="font-mono">accessibilityTree: null</code> rather
                than an error.
              </Callout>
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
              onKeyDown={(e) => e.key === 'Enter' && handleRun()}
              placeholder="Enter a URL..."
              className="input-field"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-cf-text">
                Root selector{' '}
                <span className="text-cf-text-subtle">(optional)</span>
              </label>
              <input
                type="text"
                value={root}
                onChange={(e) => setRoot(e.target.value)}
                placeholder="main, nav, #content..."
                className="input-field text-sm"
              />
            </div>
            <div className="flex items-end">
              <label className="flex cursor-pointer items-center gap-2 pb-2.5 text-sm text-cf-text">
                <input
                  type="checkbox"
                  checked={interestingOnly}
                  onChange={(e) => setInterestingOnly(e.target.checked)}
                  className="accent-cf-orange"
                />
                Interesting nodes only
              </label>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRun}
              disabled={loading || !url.trim()}
              className="btn-base btn-primary"
            >
              {loading ? 'Reading...' : 'Run'}
            </button>
            <div className="flex flex-wrap gap-2">
              {presets.map((p) => (
                <PillButton
                  key={p.label}
                  label={p.label}
                  active={url === p.url}
                  onClick={() => {
                    setUrl(p.url);
                    setRoot(p.root);
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
          {
            icon: <Bot size={18} />,
            title: 'Agent Navigation',
            description:
              'Give an agent a compact, semantic map of the page so it can locate controls without screenshot-analyze-click loops.',
          },
          {
            icon: <Accessibility size={18} />,
            title: 'Accessibility Auditing',
            description:
              'Inspect the roles and accessible names a screen reader would announce, and spot unlabelled controls.',
          },
          {
            icon: <Crosshair size={18} />,
            title: 'Resilient Selectors',
            description:
              'Target elements by role and name instead of brittle CSS paths that break on every redesign.',
          },
        ]}
      />
    </DemoPage>
  );
}
