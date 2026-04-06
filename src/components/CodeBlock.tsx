import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import SyntaxHighlight, { type Language } from './SyntaxHighlight';
import { Badge } from './Badge';

interface CodeBlockProps {
  code: string;
  language?: string;
  title?: string;
}

export default function CodeBlock({
  code,
  language = 'typescript',
  title = 'API CODE',
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="dark-surface rounded-lg border border-surface-dark-border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-surface-dark-border">
        <Badge variant="neutral">
          {title}
        </Badge>
        <div className="flex items-center gap-2">
          {language && (
            <span className="text-[10px] text-surface-dark-dim font-mono">
              {language}
            </span>
          )}
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-md transition-colors text-surface-dark-dim hover:text-surface-dark-text cursor-pointer"
            title="Copy code"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
      </div>
      <div className="p-4 overflow-x-auto text-sm leading-relaxed">
        <SyntaxHighlight code={code} language={language as Language} />
      </div>
    </div>
  );
}
