import { Reveal } from '../components/reveal';
import type { SlideProperties } from '../types';

const CF_LOGO_PATH =
  'M52.688 13.028c-.22 0-.437.008-.654.015a.3.3 0 0 0-.102.024.37.37 0 0 0-.236.255l-.93 3.249c-.401 1.397-.252 2.687.422 3.634.618.876 1.646 1.39 2.894 1.45l5.045.306a.45.45 0 0 1 .435.41.5.5 0 0 1-.025.223.64.64 0 0 1-.547.426l-5.242.306c-2.848.132-5.912 2.456-6.987 5.29l-.378 1a.28.28 0 0 0 .248.382h18.054a.48.48 0 0 0 .464-.35c.32-1.153.482-2.344.48-3.54 0-7.22-5.79-13.072-12.933-13.072M44.807 29.578l.334-1.175c.402-1.397.253-2.687-.42-3.634-.62-.876-1.647-1.39-2.896-1.45l-23.665-.306a.47.47 0 0 1-.374-.199.5.5 0 0 1-.052-.434.64.64 0 0 1 .552-.426l23.886-.306c2.836-.131 5.9-2.456 6.975-5.29l1.362-3.6a.9.9 0 0 0 .04-.477C48.997 5.259 42.789 0 35.367 0c-6.842 0-12.647 4.462-14.73 10.665a6.92 6.92 0 0 0-4.911-1.374c-3.28.33-5.92 3.002-6.246 6.318a7.2 7.2 0 0 0 .18 2.472C4.3 18.241 0 22.679 0 28.133q0 .74.106 1.453a.46.46 0 0 0 .457.402h43.704a.57.57 0 0 0 .54-.418';

export function TitleSlide({ step }: SlideProperties) {
  return (
    <div className="relative flex h-screen w-screen items-center justify-center overflow-hidden bg-cf-bg-100">
      {/* Radial gradient glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_40%,_rgba(255,72,1,0.08)_0%,_transparent_70%)]" />
      <div className="pointer-events-none absolute inset-0 dot-pattern opacity-20" />

      <div className="relative z-10 flex flex-col items-center gap-8 text-center">
        {/* CF Logo */}
        <Reveal visible={step >= 0} direction="up" delay={0}>
          <svg
            viewBox="0 0 66 30"
            className="h-16 w-auto text-cf-orange"
            fill="currentColor"
            aria-label="Cloudflare logo"
          >
            <path d={CF_LOGO_PATH} />
          </svg>
        </Reveal>

        {/* Title */}
        <Reveal visible={step >= 0} direction="up" delay={0.1}>
          <h1 className="font-sans text-7xl font-bold tracking-tight text-cf-text">
            Browser Rendering
          </h1>
        </Reveal>

        {/* Subtitle */}
        <Reveal visible={step >= 0} direction="up" delay={0.2}>
          <p className="max-w-xl text-xl leading-relaxed text-cf-text-muted">
            Run headless Chrome on Cloudflare&rsquo;s global network
          </p>
        </Reveal>

        {/* API URL pill — step 1 */}
        <Reveal visible={step >= 1} direction="up" delay={0.1}>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-cf-border bg-cf-bg-200 px-5 py-2.5 font-mono text-sm text-cf-text-muted shadow-card">
            <span className="text-cf-orange">GET</span>
            <span className="text-cf-text-subtle">/</span>
            <span>https://api.cloudflare.com/client/v4/accounts/:account_id/browser-rendering</span>
          </div>
        </Reveal>
      </div>
    </div>
  );
}

TitleSlide.steps = 2;
