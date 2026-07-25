import { useState, type ReactNode } from 'react';
import CodeBlock from './CodeBlock';
import PillButton from './PillButton';
import StatusBadge from './StatusBadge';
import { Callout } from './Callout';
import { Badge } from './Badge';

interface DemoPageProps {
  title: string;
  description: string;
  endpoint: string;
  apiCode: string;
  inputLabel?: string;
  inputPlaceholder?: string;
  pills?: Array<{ label: string; value: string }>;
  children?: ReactNode;
  badge?: 'beta';
  info: string;
  customForm?: ReactNode;
  onRun?: (url: string) => Promise<void>;
  resultContent?: ReactNode;
  fullWidthResult?: boolean;
  loading?: boolean;
  error?: string | null;
  /** Browser time in whole ms, from the X-Browser-Ms-Used response header */
  browserMs?: number | null;
}

export default function DemoPage({
  title,
  description,
  endpoint,
  apiCode,
  inputLabel = 'URL',
  inputPlaceholder = 'Enter a URL...',
  pills = [],
  children,
  badge,
  info,
  customForm,
  onRun,
  resultContent,
  fullWidthResult = false,
  loading = false,
  error = null,
  browserMs = null,
}: DemoPageProps) {
  const [url, setUrl] = useState('');
  const [showCode, setShowCode] = useState(false);

  const handleRun = () => {
    if (onRun && url.trim()) {
      onRun(url.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleRun();
  };

  return (
    <section className={fullWidthResult ? 'max-w-6xl mx-auto' : 'max-w-4xl mx-auto'}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-3xl font-semibold tracking-tight text-cf-text">{title}</h2>
          {badge === 'beta' && <Badge variant="warning">BETA</Badge>}
        </div>
        <p className="text-cf-text-muted text-lg">{description}</p>
        <p className="font-mono text-sm text-cf-text-subtle mt-1">{endpoint}</p>
      </div>

      {/* Code Block Toggle */}
      <div className="mb-6">
        <button
          onClick={() => setShowCode(!showCode)}
          className="font-mono text-xs font-medium text-cf-orange hover:text-cf-orange-hover transition-colors cursor-pointer"
        >
          {showCode ? 'Hide' : 'Show'} API Code
        </button>
        {showCode && (
          <div className="mt-3">
            <CodeBlock code={apiCode} />
          </div>
        )}
      </div>

      {/* Input Area */}
      {customForm || (
        <div className="mb-4">
          <label className="block text-sm font-medium text-cf-text mb-2">
            {inputLabel}
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={inputPlaceholder}
              className="input-field flex-1"
            />
            <button
              onClick={handleRun}
              disabled={loading || !url.trim()}
              className="btn-base btn-primary"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Running
                </span>
              ) : (
                'Run'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Pill Buttons */}
      {pills.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {pills.map((pill) => (
            <PillButton
              key={pill.value}
              label={pill.label}
              onClick={() => {
                setUrl(pill.value);
                if (onRun) onRun(pill.value);
              }}
              active={url === pill.value}
            />
          ))}
        </div>
      )}

      {/* Extra children (additional form fields) */}
      {children}

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg border border-surface-dark-error/30 bg-[oklch(from_#dc2626_l_c_h_/_6%)] p-4">
          <p className="text-sm font-medium text-cf-error">Error</p>
          <p className="text-sm text-cf-text-muted mt-1 font-mono break-all">
            {error}
          </p>
        </div>
      )}

      {/* Browser Time */}
      {browserMs != null && (
        <div className="mb-4 flex items-center gap-2">
          <StatusBadge
            status="success"
            label={`${browserMs.toLocaleString()}ms browser time`}
          />
        </div>
      )}

      {/* Result Area */}
      {resultContent && (
        fullWidthResult ? (
          <div className="mb-6">{resultContent}</div>
        ) : (
          <div className="mb-6 rounded-lg border border-cf-border bg-cf-bg-200 shadow-card overflow-hidden">
            <div className="px-4 py-2 bg-cf-bg-300 border-b border-cf-border">
              <span className="text-[10px] font-medium text-cf-text-subtle uppercase tracking-wider">
                Result
              </span>
            </div>
            <div className="p-4">{resultContent}</div>
          </div>
        )
      )}

      {/* Info Callout */}
      <div className="mt-6">
        <Callout>
          <p className="text-sm leading-relaxed">{info}</p>
        </Callout>
      </div>
    </section>
  );
}
