import type { ReactNode } from 'react';

export function Callout({
  children,
  variant,
}: {
  children: ReactNode;
  variant?: 'ai';
}) {
  return (
    <div
      className={`
        rounded-r-md border-l-3 px-5 py-3.5 text-[15px] leading-relaxed
        text-cf-text-muted
        ${variant === 'ai' ? 'border-l-cf-ai bg-[#f3ecff]' : 'border-l-cf-orange bg-[#fff0e6]'}
      `}
    >
      {children}
    </div>
  );
}
