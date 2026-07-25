import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Camera, Globe, TestTube } from 'lucide-react';
import DemoPage from '../components/DemoPage';
import UseCases from '../components/UseCases';
import ResultToolbar from '../components/ResultToolbar';
import { takeScreenshot } from '../server/browser-rendering';

export const Route = createFileRoute('/screenshot')({
  component: ScreenshotDemo,
});

const apiCode = `const resp = await fetch(
  \`https://api.cloudflare.com/client/v4/accounts/\${accountId}/browser-rendering/screenshot\`,
  {
    method: 'POST',
    headers: {
      Authorization: \`Bearer \${apiToken}\`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: 'https://example.com',
      screenshotOptions: { type: 'png', fullPage: false },
    }),
  }
);
// Returns: image binary (PNG/WebP/JPEG)`;

const pills = [
  { label: 'example.com', value: 'https://example.com' },
  { label: 'cloudflare.com', value: 'https://cloudflare.com' },
  {
    label: 'developers.cloudflare.com',
    value: 'https://developers.cloudflare.com',
  },
  { label: 'github.com', value: 'https://github.com' },
];

function ScreenshotDemo() {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [browserMs, setBrowserMs] = useState<number | null>(null);
  const [format, setFormat] = useState<'png' | 'webp' | 'jpeg'>('png');
  const [fullPage, setFullPage] = useState(false);

  const handleRun = async (url: string) => {
    setLoading(true);
    setError(null);
    setImage(null);
    setBrowserMs(null);
    try {
      const result = await takeScreenshot({
        data: {
          url,
          screenshotOptions: { type: format, fullPage },
        },
      });
      setImage(result.image);
      setBrowserMs(result.browserMs);
    } catch (e: any) {
      setError(e.message || 'Screenshot failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DemoPage
      title="Screenshot"
      description="Capture a screenshot of any webpage. Supports PNG, WebP, and JPEG formats with full-page and viewport options."
      endpoint="POST /screenshot"
      apiCode={apiCode}
      pills={pills}
      info="The /screenshot endpoint renders the webpage by processing its HTML and JavaScript, then captures a screenshot of the fully rendered page. You can provide either a URL or custom HTML."
      onRun={handleRun}
      loading={loading}
      error={error}
      resultContent={
        image ? (
          <div>
            <ResultToolbar
              browserMs={browserMs}
              contentSize={image.length}
              contentLabel="image data"
              download={{ data: image, filename: `screenshot.${format}`, mime: `image/${format}` }}
            />
            <img src={image} alt="Screenshot result" className="max-w-full rounded-lg border border-cf-border mt-3" />
          </div>
        ) : undefined
      }
    >
      <div className="flex items-center gap-4 mb-4">
        <label className="flex items-center gap-2 text-sm text-cf-text">
          <span>Format:</span>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as any)}
            className="px-3 py-1.5 rounded-lg border border-cf-border bg-white text-sm"
          >
            <option value="png">PNG</option>
            <option value="webp">WebP</option>
            <option value="jpeg">JPEG</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-cf-text cursor-pointer">
          <input
            type="checkbox"
            checked={fullPage}
            onChange={(e) => setFullPage(e.target.checked)}
            className="rounded border-cf-border accent-cf-orange"
          />
          Full page
        </label>
      </div>
      <UseCases
        cases={[
          { icon: <Globe size={18} />, title: 'Visual Regression Testing', description: 'Capture screenshots of your site after deployments to detect visual changes automatically.' },
          { icon: <Camera size={18} />, title: 'Social Media Previews', description: 'Generate OG images and social cards dynamically from live webpage content.' },
          { icon: <TestTube size={18} />, title: 'Competitive Monitoring', description: 'Track visual changes on competitor websites and receive alerts when layouts change.' },
        ]}
      />
    </DemoPage>
  );
}
