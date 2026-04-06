interface StatusBadgeProps {
  status: 'ready' | 'loading' | 'success' | 'error' | 'beta';
  label?: string;
}

const statusConfig = {
  ready: {
    bg: 'bg-[oklch(from_#16a34a_l_c_h_/_8%)]',
    text: 'text-cf-success',
    dot: 'bg-cf-success',
  },
  loading: {
    bg: 'bg-[oklch(from_#eab308_l_c_h_/_8%)]',
    text: 'text-cf-warning',
    dot: 'bg-cf-warning',
  },
  success: {
    bg: 'bg-[oklch(from_#16a34a_l_c_h_/_8%)]',
    text: 'text-cf-success',
    dot: 'bg-cf-success',
  },
  error: {
    bg: 'bg-[oklch(from_#dc2626_l_c_h_/_8%)]',
    text: 'text-cf-error',
    dot: 'bg-cf-error',
  },
  beta: {
    bg: 'bg-cf-orange-light',
    text: 'text-cf-orange',
    dot: 'bg-cf-orange',
  },
};

export default function StatusBadge({ status, label }: StatusBadgeProps) {
  const config = statusConfig[status];
  const displayLabel =
    label || status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[11px] ${config.bg} ${config.text}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${config.dot} ${status === 'loading' ? 'animate-pulse' : ''}`}
      />
      {displayLabel}
    </span>
  );
}
