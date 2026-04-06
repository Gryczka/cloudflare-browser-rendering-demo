import type { ReactNode } from 'react';

interface UseCase {
  icon: ReactNode;
  title: string;
  description: string;
}

interface UseCasesProps {
  cases: UseCase[];
}

export default function UseCases({ cases }: UseCasesProps) {
  return (
    <div className="mb-6">
      <h3 className="text-xs font-semibold text-cf-text-muted uppercase tracking-wider mb-3">
        Use Cases
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {cases.map((c, i) => (
          <div
            key={i}
            className="flex items-start gap-3 p-3 rounded-lg bg-white border border-cf-border"
          >
            <div className="text-cf-orange shrink-0 mt-0.5">{c.icon}</div>
            <div>
              <p className="text-sm font-medium text-cf-text">{c.title}</p>
              <p className="text-xs text-cf-text-muted mt-0.5 leading-relaxed">
                {c.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
