import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Bot, BookOpen, Database } from 'lucide-react';
import DemoPage from '../components/DemoPage';
import UseCases from '../components/UseCases';
import ResultToolbar from '../components/ResultToolbar';
import { fetchMarkdown } from '../server/browser-rendering';

export const Route = createFileRoute('/markdown')({
  component: MarkdownDemo,
});

const apiCode = `const resp = await fetch(
  \`https://api.cloudflare.com/client/v4/accounts/\${accountId}/browser-rendering/markdown\`,
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
// Returns: Markdown text`;

const pills = [
  { label: 'example.com', value: 'https://example.com' },
  {
    label: 'developers.cloudflare.com',
    value: 'https://developers.cloudflare.com',
  },
  {
    label: 'blog.cloudflare.com',
    value: 'https://blog.cloudflare.com',
  },
];

function MarkdownDemo() {
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [browserMs, setBrowserMs] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'raw' | 'preview'>('raw');

  const handleRun = async (url: string) => {
    setLoading(true);
    setError(null);
    setMarkdown(null);
    setBrowserMs(null);
    try {
      const result = await fetchMarkdown({ data: { url } });
      setMarkdown(result.markdown);
      setBrowserMs(result.browserMs);
    } catch (e: any) {
      setError(e.message || 'Markdown extraction failed');
    } finally {
      setLoading(false);
    }
  };

  const simpleMarkdownToHtml = (md: string): string => {
    return md
      .replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
      .replace(/^## (.*$)/gm, '<h2 class="text-xl font-semibold mt-5 mb-2">$1</h2>')
      .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mt-6 mb-3">$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-cf-orange hover:underline" target="_blank" rel="noopener">$1</a>')
      .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">$1</code>')
      .replace(/^- (.*$)/gm, '<li class="ml-4 list-disc">$1</li>')
      .replace(/^(?!<[hluod])(.*$)/gm, (match) => match.trim() ? `<p class="mb-2">${match}</p>` : '<br/>')
      .replace(/(<li.*<\/li>)/s, '<ul>$1</ul>');
  };

  return (
    <DemoPage
      title="Markdown Extraction"
      description="Convert any webpage into clean Markdown. Perfect for feeding content into LLMs, building RAG pipelines, or creating documentation."
      endpoint="POST /markdown"
      apiCode={apiCode}
      pills={pills}
      info="The /markdown endpoint converts a webpage's content into Markdown format. This is especially useful for AI applications where you need clean, structured text from web pages."
      onRun={handleRun}
      loading={loading}
      error={error}
      resultContent={
        markdown ? (
          <div>
            <ResultToolbar
              browserMs={browserMs}
              contentSize={markdown.length}
              contentLabel="markdown"
              copyContent={markdown}
              download={{ data: markdown, filename: 'content.md', mime: 'text/markdown' }}
            />
            <div className="flex gap-2 my-3">
              <button onClick={() => setViewMode('raw')} className={`px-3 py-1 text-sm rounded-lg cursor-pointer transition-colors ${viewMode === 'raw' ? 'bg-cf-orange text-white' : 'bg-gray-100 text-cf-text'}`}>Raw</button>
              <button onClick={() => setViewMode('preview')} className={`px-3 py-1 text-sm rounded-lg cursor-pointer transition-colors ${viewMode === 'preview' ? 'bg-cf-orange text-white' : 'bg-gray-100 text-cf-text'}`}>Preview</button>
            </div>
            {viewMode === 'raw' ? (
              <pre className="bg-cf-code-bg text-gray-300 p-4 rounded-lg overflow-auto max-h-[500px] text-sm font-mono whitespace-pre-wrap">{markdown}</pre>
            ) : (
              <div className="prose prose-sm max-w-none p-4 bg-white rounded-lg border border-cf-border overflow-auto max-h-[500px]" dangerouslySetInnerHTML={{ __html: simpleMarkdownToHtml(markdown) }} />
            )}
          </div>
        ) : undefined
      }
    >
      <UseCases
        cases={[
          { icon: <Bot size={18} />, title: 'LLM Context', description: 'Feed clean webpage content into LLMs and chatbots without HTML noise or boilerplate.' },
          { icon: <Database size={18} />, title: 'RAG Pipelines', description: 'Build retrieval-augmented generation systems with clean, structured web content.' },
          { icon: <BookOpen size={18} />, title: 'Documentation Import', description: 'Convert external documentation pages into Markdown for your own knowledge base.' },
        ]}
      />
    </DemoPage>
  );
}
