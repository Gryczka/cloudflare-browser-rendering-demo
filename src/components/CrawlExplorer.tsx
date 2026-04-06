import { useState, useMemo } from 'react';
import StatusBadge from './StatusBadge';
import SyntaxHighlight from './SyntaxHighlight';

interface CrawlRecord {
  url: string;
  status: string;
  metadata?: {
    status?: number;
    title?: string;
    url?: string;
    lastModified?: string;
  };
  markdown?: string;
  html?: string;
  json?: any;
}

interface CrawlJobMeta {
  id?: string;
  status?: string;
  total?: number;
  finished?: number;
  skipped?: number;
  browserSecondsUsed?: number;
  records?: CrawlRecord[];
}

interface CrawlExplorerProps {
  jobMeta: CrawlJobMeta;
  records: CrawlRecord[];
  jobId: string;
  hasJson?: boolean;
  onShowSkipped?: () => void;
  skippedRecords?: CrawlRecord[];
  showSkipped?: boolean;
}

type ViewTab = 'markdown' | 'html-source' | 'html-preview' | 'json' | 'metadata';
type FilterStatus = 'all' | 'completed' | 'skipped';

export default function CrawlExplorer({
  jobMeta,
  records,
  jobId,
  hasJson = false,
  onShowSkipped: _onShowSkipped,
  skippedRecords: _skippedRecords,
  showSkipped: _showSkipped,
}: CrawlExplorerProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [viewTab, setViewTab] = useState<ViewTab>('markdown');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [showSidebar, setShowSidebar] = useState(true);

  // Separate completed and skipped records
  const completedRecords = useMemo(
    () => records.filter((r) => r.status === 'completed' || r.status === 'complete'),
    [records]
  );
  const allRecords = useMemo(() => {
    if (filterStatus === 'completed') return completedRecords;
    if (filterStatus === 'skipped')
      return records.filter((r) => r.status === 'skipped');
    return records;
  }, [records, completedRecords, filterStatus]);

  // Filter by search
  const filteredRecords = useMemo(() => {
    if (!searchQuery.trim()) return allRecords;
    const q = searchQuery.toLowerCase();
    return allRecords.filter(
      (r) =>
        r.url.toLowerCase().includes(q) ||
        r.metadata?.title?.toLowerCase().includes(q) ||
        r.markdown?.toLowerCase().includes(q)
    );
  }, [allRecords, searchQuery]);

  const selectedRecord =
    selectedIndex !== null ? filteredRecords[selectedIndex] : null;

  // Build tabs dynamically based on what content is available
  const tabs = useMemo(() => {
    const t: Array<{ id: ViewTab; label: string; size?: number }> = [
      { id: 'markdown', label: 'Markdown', size: selectedRecord?.markdown?.length },
      { id: 'html-source', label: 'HTML', size: selectedRecord?.html?.length },
      { id: 'html-preview', label: 'Preview', size: selectedRecord?.html?.length },
    ];
    if (hasJson) {
      const jsonStr = selectedRecord?.json
        ? JSON.stringify(selectedRecord.json).length
        : undefined;
      t.push({ id: 'json', label: 'JSON (AI)', size: jsonStr });
    }
    t.push({ id: 'metadata', label: 'Metadata' });
    return t;
  }, [selectedRecord, hasJson]);

  const handleExportAll = () => {
    const exportData = completedRecords.map((r) => ({
      url: r.url,
      title: r.metadata?.title,
      httpStatus: r.metadata?.status,
      markdown: r.markdown,
      html: r.html,
      ...(hasJson ? { json: r.json } : {}),
    }));
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crawl-${jobId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportMarkdown = () => {
    const md = completedRecords
      .map((r) => {
        const title = r.metadata?.title || r.url;
        return `---\nurl: ${r.url}\ntitle: ${title}\n---\n\n${r.markdown || '(no content)'}\n\n`;
      })
      .join('\n---\n\n');
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crawl-${jobId}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyContent = () => {
    if (!selectedRecord) return;
    let content: string | undefined;
    switch (viewTab) {
      case 'markdown':
        content = selectedRecord.markdown;
        break;
      case 'html-source':
      case 'html-preview':
        content = selectedRecord.html;
        break;
      case 'json':
        content = selectedRecord.json
          ? JSON.stringify(selectedRecord.json, null, 2)
          : undefined;
        break;
      case 'metadata':
        content = JSON.stringify(
          {
            url: selectedRecord.url,
            status: selectedRecord.status,
            ...(selectedRecord.metadata || {}),
          },
          null,
          2
        );
        break;
    }
    if (content) navigator.clipboard.writeText(content);
  };

  return (
    <div className="space-y-4">
      {/* ── Stats Bar ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Total Pages" value={jobMeta.total ?? 0} />
        <StatCard
          label="Crawled"
          value={jobMeta.finished ?? 0}
          color="green"
        />
        <StatCard
          label="Skipped"
          value={jobMeta.skipped ?? 0}
          color="orange"
        />
        <StatCard
          label="Browser Time"
          value={`${(jobMeta.browserSecondsUsed ?? 0).toFixed(2)}s`}
        />
        <StatCard
          label="Content Size"
          value={formatBytes(
            completedRecords.reduce(
              (sum, r) => sum + (r.markdown?.length ?? 0) + (r.html?.length ?? 0),
              0
            )
          )}
        />
      </div>

      {/* ── Toolbar ──────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 pb-3 border-b border-cf-border">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSelectedIndex(null);
            }}
            placeholder="Search pages by URL, title, or content..."
            className="w-full px-3 py-2 rounded-lg border border-cf-border bg-white text-sm placeholder-cf-text-muted focus:outline-none focus:border-cf-orange focus:ring-1 focus:ring-cf-orange/20"
          />
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          {(['all', 'completed', 'skipped'] as FilterStatus[]).map((f) => (
            <button
              key={f}
              onClick={() => {
                setFilterStatus(f);
                setSelectedIndex(null);
              }}
              className={`px-3 py-1 text-xs rounded-md cursor-pointer transition-colors ${
                filterStatus === f
                  ? 'bg-white text-cf-text shadow-sm font-medium'
                  : 'text-cf-text-muted hover:text-cf-text'
              }`}
            >
              {f === 'all'
                ? `All (${records.length})`
                : f === 'completed'
                  ? `Crawled (${completedRecords.length})`
                  : `Skipped (${(jobMeta.skipped ?? 0)})`}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportAll}
            className="px-3 py-1.5 text-xs bg-white border border-cf-border rounded-lg hover:border-cf-orange hover:text-cf-orange transition-colors cursor-pointer"
          >
            Export JSON
          </button>
          <button
            onClick={handleExportMarkdown}
            className="px-3 py-1.5 text-xs bg-white border border-cf-border rounded-lg hover:border-cf-orange hover:text-cf-orange transition-colors cursor-pointer"
          >
            Export Markdown
          </button>
        </div>
      </div>

      {/* ── Split Pane: Page List + Content Viewer ────────────── */}
      <div className="flex gap-4 min-h-[500px]">
        {/* Page List (left) */}
        {showSidebar && (
          <div className="w-72 shrink-0 border border-cf-border rounded-xl bg-white overflow-hidden flex flex-col">
            <div className="px-3 py-2 bg-gray-50 border-b border-cf-border flex items-center justify-between">
              <span className="text-xs font-semibold text-cf-text-muted uppercase tracking-wider">
                Pages ({filteredRecords.length})
              </span>
              <button
                onClick={() => setShowSidebar(false)}
                className="text-xs text-cf-text-muted hover:text-cf-text cursor-pointer"
                title="Hide page list"
              >
                &laquo;
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredRecords.map((record, i) => {
                const isCompleted =
                  record.status === 'completed' || record.status === 'complete';
                let title: string;
                try {
                  title = record.metadata?.title || new URL(record.url).pathname;
                } catch {
                  title = record.url;
                }
                const isSelected = selectedIndex === i;
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedIndex(i)}
                    className={`w-full text-left px-3 py-2.5 border-b border-cf-border/50 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-cf-orange/5 border-l-3 border-l-cf-orange'
                        : 'hover:bg-gray-50 border-l-3 border-l-transparent'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className={`mt-1 w-2 h-2 rounded-full shrink-0 ${isCompleted ? 'bg-green-400' : 'bg-gray-300'}`}
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-xs font-medium truncate ${isSelected ? 'text-cf-orange' : 'text-cf-text'}`}
                        >
                          {title}
                        </p>
                        <p className="text-[10px] text-cf-text-muted font-mono truncate mt-0.5">
                          {record.url}
                        </p>
                        {isCompleted && (
                          <div className="flex items-center gap-2 mt-1">
                            {record.metadata?.status && (
                              <span className="text-[10px] text-cf-text-muted">
                                HTTP {record.metadata.status}
                              </span>
                            )}
                            {record.markdown && (
                              <span className="text-[10px] text-cf-text-muted">
                                {formatBytes(record.markdown.length)}
                              </span>
                            )}
                            {record.json && (
                              <span className="text-[10px] text-cf-orange font-medium">
                                JSON
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
              {filteredRecords.length === 0 && (
                <p className="text-sm text-cf-text-muted p-4 text-center">
                  No pages match your search
                </p>
              )}
            </div>
          </div>
        )}

        {/* Content Viewer (right) */}
        <div className="flex-1 border border-cf-border rounded-xl bg-white overflow-hidden flex flex-col min-w-0">
          {selectedRecord ? (
            <>
              {/* Content Header */}
              <div className="px-4 py-3 bg-gray-50 border-b border-cf-border">
                <div className="flex items-center gap-2 mb-1">
                  {!showSidebar && (
                    <button
                      onClick={() => setShowSidebar(true)}
                      className="text-xs text-cf-text-muted hover:text-cf-text cursor-pointer mr-1"
                      title="Show page list"
                    >
                      &raquo;
                    </button>
                  )}
                  <StatusBadge
                    status={
                      selectedRecord.status === 'completed' ||
                      selectedRecord.status === 'complete'
                        ? 'success'
                        : 'error'
                    }
                    label={selectedRecord.status}
                  />
                  {selectedRecord.metadata?.status && (
                    <span className="text-xs font-mono text-cf-text-muted">
                      HTTP {selectedRecord.metadata.status}
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-semibold text-cf-text truncate">
                  {selectedRecord.metadata?.title || selectedRecord.url}
                </h3>
                <a
                  href={selectedRecord.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-cf-orange hover:underline font-mono"
                >
                  {selectedRecord.url}
                </a>
              </div>

              {/* Content Tabs */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-cf-border bg-white">
                <div className="flex gap-1 flex-wrap">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setViewTab(tab.id)}
                      className={`px-3 py-1.5 text-xs rounded-lg cursor-pointer transition-colors ${
                        viewTab === tab.id
                          ? 'bg-cf-orange text-white'
                          : 'bg-gray-100 text-cf-text hover:bg-gray-200'
                      }`}
                    >
                      {tab.label}
                      {tab.size ? (
                        <span className="ml-1 opacity-70">
                          ({formatBytes(tab.size)})
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleCopyContent}
                  className="text-xs text-cf-text-muted hover:text-cf-orange cursor-pointer shrink-0 ml-2"
                >
                  Copy
                </button>
              </div>

              {/* Content Body */}
              <div className="flex-1 overflow-auto">
                {viewTab === 'markdown' && (
                  <div className="p-4">
                    {selectedRecord.markdown ? (
                      <SyntaxHighlight
                        code={selectedRecord.markdown}
                        language="markdown"
                        className="text-sm leading-relaxed"
                      />
                    ) : (
                      <EmptyState message="No markdown content available. Make sure 'markdown' is included in Output Formats." />
                    )}
                  </div>
                )}
                {viewTab === 'html-source' && (
                  <div className="p-4">
                    {selectedRecord.html ? (
                      <div className="bg-cf-code-bg rounded-lg p-4 overflow-auto">
                        <SyntaxHighlight
                          code={selectedRecord.html}
                          language="html"
                          className="text-xs"
                        />
                      </div>
                    ) : (
                      <EmptyState message="No HTML content available. Make sure 'html' is included in Output Formats." />
                    )}
                  </div>
                )}
                {viewTab === 'html-preview' && (
                  <div className="p-0 h-full">
                    {selectedRecord.html ? (
                      <iframe
                        srcDoc={selectedRecord.html}
                        className="w-full h-full min-h-[400px] border-none"
                        title="HTML Preview"
                        sandbox="allow-same-origin"
                      />
                    ) : (
                      <div className="p-4">
                        <EmptyState message="No HTML content available for preview." />
                      </div>
                    )}
                  </div>
                )}
                {viewTab === 'json' && (
                  <div className="p-4">
                    {selectedRecord.json ? (
                      <div className="bg-cf-code-bg rounded-lg p-4 overflow-auto">
                        <SyntaxHighlight
                          code={JSON.stringify(selectedRecord.json, null, 2)}
                          language="json"
                          className="text-xs"
                        />
                      </div>
                    ) : (
                      <EmptyState message="No JSON data available for this page. The AI extraction may not have returned results." />
                    )}
                  </div>
                )}
                {viewTab === 'metadata' && (
                  <div className="p-4">
                    <div className="bg-cf-code-bg rounded-lg p-4 overflow-auto">
                      <SyntaxHighlight
                        code={JSON.stringify(
                          {
                            url: selectedRecord.url,
                            status: selectedRecord.status,
                            ...(selectedRecord.metadata || {}),
                            contentSizes: {
                              markdown: selectedRecord.markdown
                                ? `${selectedRecord.markdown.length} chars`
                                : 'N/A',
                              html: selectedRecord.html
                                ? `${selectedRecord.html.length} chars`
                                : 'N/A',
                              json: selectedRecord.json
                                ? `${JSON.stringify(selectedRecord.json).length} chars`
                                : 'N/A',
                            },
                          },
                          null,
                          2
                        )}
                        language="json"
                        className="text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-cf-text-muted">
              <div className="text-center">
                {!showSidebar && (
                  <button
                    onClick={() => setShowSidebar(true)}
                    className="text-xs text-cf-orange hover:underline cursor-pointer mb-3 block mx-auto"
                  >
                    Show page list
                  </button>
                )}
                <p className="text-sm">
                  Select a page from the list to view its content
                </p>
                <p className="text-xs mt-1">
                  {completedRecords.length} pages crawled with content
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Raw Response Toggle ──────────────────────────────── */}
      <details className="text-xs">
        <summary className="text-cf-text-muted cursor-pointer hover:text-cf-orange">
          Raw API Response
        </summary>
        <div className="bg-cf-code-bg rounded-lg p-3 overflow-auto max-h-[300px] mt-2">
          <SyntaxHighlight
            code={JSON.stringify(jobMeta, null, 2)}
            language="json"
            className="text-xs"
          />
        </div>
      </details>
    </div>
  );
}

// ── Helper Components ─────────────────────────────────────────────

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color?: 'green' | 'orange';
}) {
  const colorClass =
    color === 'green'
      ? 'text-green-600'
      : color === 'orange'
        ? 'text-cf-orange'
        : 'text-cf-text';
  return (
    <div className="bg-white rounded-lg border border-cf-border p-3">
      <p className="text-[10px] uppercase tracking-wider text-cf-text-muted font-semibold">
        {label}
      </p>
      <p className={`text-lg font-bold mt-0.5 ${colorClass}`}>{value}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-12 text-cf-text-muted">
      <p className="text-sm">{message}</p>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
