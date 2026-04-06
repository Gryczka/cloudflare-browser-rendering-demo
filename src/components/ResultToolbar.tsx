import { useState } from 'react';
import { Download, Copy, Check, Clock, HardDrive } from 'lucide-react';

interface ResultToolbarProps {
  /** Browser time in ms from the API response */
  browserMs?: string | null;
  /** Size of the result content in bytes */
  contentSize?: number;
  /** Label for the content type */
  contentLabel?: string;
  /** Content string for copy-to-clipboard */
  copyContent?: string;
  /** Download configuration */
  download?: {
    data: string;
    filename: string;
    mime: string;
  };
}

export default function ResultToolbar({
  browserMs,
  contentSize,
  contentLabel,
  copyContent,
  download,
}: ResultToolbarProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!copyContent) return;
    navigator.clipboard.writeText(copyContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!download) return;
    const blob = new Blob([download.data], { type: download.mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = download.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Metrics */}
      {browserMs && (
        <span className="inline-flex items-center gap-1.5 text-xs text-cf-text-muted">
          <Clock size={12} className="text-green-500" />
          <span>
            <strong className="text-cf-text">{browserMs}</strong>ms
          </span>
        </span>
      )}
      {contentSize != null && contentSize > 0 && (
        <span className="inline-flex items-center gap-1.5 text-xs text-cf-text-muted">
          <HardDrive size={12} className="text-blue-500" />
          <span>
            <strong className="text-cf-text">{formatSize(contentSize)}</strong>
            {contentLabel ? ` ${contentLabel}` : ''}
          </span>
        </span>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Actions */}
      {copyContent && (
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-cf-text-muted hover:text-cf-orange border border-cf-border rounded-lg hover:border-cf-orange transition-colors cursor-pointer"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      )}
      {download && (
        <button
          onClick={handleDownload}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-cf-text-muted hover:text-cf-orange border border-cf-border rounded-lg hover:border-cf-orange transition-colors cursor-pointer"
        >
          <Download size={12} />
          Download
        </button>
      )}
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
