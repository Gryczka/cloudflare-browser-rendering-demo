import type { ReactNode } from 'react';

export function SlideLayout({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative flex h-screen w-screen flex-col overflow-hidden bg-cf-bg-100 ${className}`}>
      <div className="pointer-events-none absolute inset-0 dot-pattern opacity-30" />
      <div className="relative z-10 flex flex-1 flex-col overflow-y-auto px-16 py-12 pb-20">
        {children}
      </div>
    </div>
  );
}
