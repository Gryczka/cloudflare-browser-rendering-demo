import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router';
import { motion } from 'motion/react';
import { Presentation, Github } from 'lucide-react';

import Sidebar from '../components/Sidebar';
import appCss from '../styles.css?url';
import { PUBLIC_ORIGIN } from '../shared/garden';

export const Route = createRootRoute({
  head: ({ matches }) => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Cloudflare Browser Run Explorer' },
      {
        name: 'description',
        content:
          'Explore Browser Run screenshots, PDFs, structured extraction, accessibility, and bounded crawls. Browsing is stateless; paid actions require an explicit click and shared admission.',
      },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      {
        rel: 'canonical',
        href: `${PUBLIC_ORIGIN}${matches.at(-1)?.pathname ?? '/'}`,
      },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap',
      },
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '32x32',
        href: '/favicon-32.png',
      },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
    ],
  }),
  component: RootLayout,
});

function RootLayout() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <div className="grid h-screen w-screen grid-cols-[240px_1fr] grid-rows-[1fr_40px] overflow-hidden">
          {/* Sidebar */}
          <Sidebar />

          {/* Main content */}
          <main className="relative overflow-hidden bg-cf-bg-100">
            <div className="pointer-events-none absolute inset-0 dot-pattern opacity-45" />
            <div className="absolute inset-0 overflow-x-hidden overflow-y-auto px-9 pt-9">
              <div className="mx-auto max-w-[1100px] pb-9">
                <Outlet />
              </div>
            </div>
          </main>

          {/* Status bar */}
          <footer className="col-span-2 flex items-center justify-between border-t border-cf-border bg-cf-bg-200 px-5 font-mono text-xs text-cf-text-subtle">
            <div className="flex items-center gap-2.5">
              <motion.span
                className="size-1.5 rounded-full bg-cf-success"
                animate={{
                  boxShadow: [
                    '0 0 0 0 oklch(from #16a34a l c h / 35%)',
                    '0 0 0 4px oklch(from #16a34a l c h / 0%)',
                    '0 0 0 0 oklch(from #16a34a l c h / 35%)',
                  ],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
              <span>Browser Run · Quick Actions</span>
            </div>

            <div className="flex items-center gap-3">
              <a
                href="https://github.com/Gryczka/cloudflare-browser-rendering-demo"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-md border border-cf-border px-2 py-0.5 font-sans text-[11px] font-medium text-cf-text-subtle transition-colors hover:border-cf-orange hover:text-cf-orange"
                title="View this demo's source on GitHub"
              >
                <Github className="size-3" />
              </a>
              <a
                href="/slides"
                className="flex cursor-pointer items-center gap-1.5 rounded-md border border-cf-border px-2 py-0.5 font-sans text-[11px] font-medium text-cf-text-subtle transition-colors hover:border-cf-orange hover:text-cf-orange"
                title="Enter presentation mode"
              >
                <Presentation className="size-3" />
                Slides
              </a>
            </div>
          </footer>
        </div>
        <Scripts />
      </body>
    </html>
  );
}
