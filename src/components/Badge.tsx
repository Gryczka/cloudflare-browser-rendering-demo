import type { ReactNode } from 'react';

const VARIANT_CLASSES = {
  success: 'bg-[oklch(from_#16a34a_l_c_h_/_8%)] text-cf-success',
  error: 'bg-[oklch(from_#dc2626_l_c_h_/_8%)] text-cf-error',
  info: 'bg-[oklch(from_#2563eb_l_c_h_/_8%)] text-cf-info',
  warning: 'bg-[oklch(from_#eab308_l_c_h_/_8%)] text-cf-warning',
  ai: 'bg-[oklch(from_#9616ff_l_c_h_/_8%)] text-cf-ai',
  neutral: 'bg-cf-bg-300 text-cf-text-muted',
} as const;

export function Badge({
  variant = 'neutral',
  children,
}: {
  variant?: keyof typeof VARIANT_CLASSES;
  children: ReactNode;
}) {
  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono
        text-[11px]
        ${VARIANT_CLASSES[variant]}
      `}
    >
      {children}
    </span>
  );
}
