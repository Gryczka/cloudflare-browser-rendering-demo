import { Link, useRouterState } from '@tanstack/react-router';
import { motion } from 'motion/react';
import {
  Camera,
  FileText,
  Code,
  FileDown,
  Scissors,
  Brain,
  Link2,
  Layers,
  Globe,
  Accessibility,
} from 'lucide-react';

const CF_LOGO = (
  <svg viewBox="0 0 66 30" fill="currentColor" className="h-3.5 w-auto shrink-0 text-cf-orange">
    <path d="M52.688 13.028c-.22 0-.437.008-.654.015a.3.3 0 0 0-.102.024.37.37 0 0 0-.236.255l-.93 3.249c-.401 1.397-.252 2.687.422 3.634.618.876 1.646 1.39 2.894 1.45l5.045.306a.45.45 0 0 1 .435.41.5.5 0 0 1-.025.223.64.64 0 0 1-.547.426l-5.242.306c-2.848.132-5.912 2.456-6.987 5.29l-.378 1a.28.28 0 0 0 .248.382h18.054a.48.48 0 0 0 .464-.35c.32-1.153.482-2.344.48-3.54 0-7.22-5.79-13.072-12.933-13.072M44.807 29.578l.334-1.175c.402-1.397.253-2.687-.42-3.634-.62-.876-1.647-1.39-2.896-1.45l-23.665-.306a.47.47 0 0 1-.374-.199.5.5 0 0 1-.052-.434.64.64 0 0 1 .552-.426l23.886-.306c2.836-.131 5.9-2.456 6.975-5.29l1.362-3.6a.9.9 0 0 0 .04-.477C48.997 5.259 42.789 0 35.367 0c-6.842 0-12.647 4.462-14.73 10.665a6.92 6.92 0 0 0-4.911-1.374c-3.28.33-5.92 3.002-6.246 6.318a7.2 7.2 0 0 0 .18 2.472C4.3 18.241 0 22.679 0 28.133q0 .74.106 1.453a.46.46 0 0 0 .457.402h43.704a.57.57 0 0 0 .54-.418" />
  </svg>
);

/**
 * Browser Run splits into two halves: Quick Actions (one-shot HTTP endpoints)
 * and Browser Sessions (Puppeteer/Playwright/CDP). Grouping the nav this way
 * mirrors the product's own vocabulary and leaves an obvious slot for the
 * Sessions pages.
 */
const navSections = [
  {
    label: 'Quick Actions',
    items: [
      { num: '01', label: 'Screenshot', to: '/screenshot', icon: Camera },
      { num: '02', label: 'PDF', to: '/pdf', icon: FileDown },
      { num: '03', label: 'Content', to: '/content', icon: Code },
      { num: '04', label: 'Markdown', to: '/markdown', icon: FileText },
      { num: '05', label: 'Scrape', to: '/scrape', icon: Scissors },
      { num: '06', label: 'JSON (AI)', to: '/json', icon: Brain },
      { num: '07', label: 'Links', to: '/links', icon: Link2 },
      { num: '08', label: 'Snapshot', to: '/snapshot', icon: Layers },
      { num: '09', label: 'A11y Tree', to: '/accessibility', icon: Accessibility, badge: 'NEW' },
      { num: '10', label: 'Crawl', to: '/crawl', icon: Globe, badge: 'BETA' },
    ],
  },
] as const;

export default function Sidebar() {
  const router = useRouterState();
  const currentPath = router.location.pathname;

  return (
    <aside className="flex w-[240px] flex-col overflow-hidden border-r border-cf-border bg-cf-bg-100">
      {/* Header */}
      <Link to="/" className="flex items-center gap-3 border-b border-cf-border px-5 py-4">
        {CF_LOGO}
        <div className="flex flex-col">
          <span className="text-[9px] font-medium tracking-wider text-cf-text-muted uppercase">
            Cloudflare
          </span>
          <span className="text-lg font-medium tracking-tight text-cf-text">
            Browser Run
          </span>
        </div>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3">
        {navSections.map((section) => (
          <div key={section.label} className="mb-1">
            <h2 className="px-5 pt-2 pb-1.5 font-sans text-[9px] font-medium tracking-wider text-cf-text-subtle uppercase">
              {section.label}
            </h2>
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = currentPath === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`
                    relative flex w-full items-center gap-2.5 px-5 py-2.5 text-left text-sm
                    transition-colors
                    ${isActive ? 'font-medium text-cf-orange' : 'text-cf-text-muted hover:bg-cf-bg-300 hover:text-cf-text'}
                  `}
                >
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 border-l-3 border-l-cf-orange bg-cf-bg-300"
                      layoutId="sidebar-active"
                      transition={{
                        type: 'spring',
                        stiffness: 380,
                        damping: 32,
                      }}
                    />
                  )}
                  <span className="relative z-10 font-mono text-[11px] text-cf-text-subtle">
                    {item.num}
                  </span>
                  <Icon className="relative z-10 size-4 opacity-60" strokeWidth={1.75} />
                  <span className="relative z-10">{item.label}</span>
                  {'badge' in item && item.badge && (
                    <span className="relative z-10 ml-auto font-mono text-[10px] text-cf-orange">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
