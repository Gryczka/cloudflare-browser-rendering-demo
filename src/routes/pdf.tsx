import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { FileText, Receipt, GraduationCap } from 'lucide-react';
import DemoPage from '../components/DemoPage';
import UseCases from '../components/UseCases';
import ResultToolbar from '../components/ResultToolbar';
import { generatePdf } from '../server/browser-rendering';

export const Route = createFileRoute('/pdf')({ component: PdfDemo });

const apiCode = `const resp = await fetch(
  \`https://api.cloudflare.com/client/v4/accounts/\${accountId}/browser-rendering/pdf\`,
  {
    method: 'POST',
    headers: {
      Authorization: \`Bearer \${apiToken}\`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: 'https://example.com',
      pdfOptions: { format: 'A4', printBackground: true },
    }),
  }
);
// Returns: PDF binary`;

const pills = [
  { label: 'example.com', value: 'https://example.com' },
  { label: 'cloudflare.com', value: 'https://cloudflare.com' },
  {
    label: 'developers.cloudflare.com',
    value: 'https://developers.cloudflare.com',
  },
];

function PdfDemo() {
  const [pdf, setPdf] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [browserMs, setBrowserMs] = useState<number | null>(null);
  const [pageFormat, setPageFormat] = useState('A4');
  const [landscape, setLandscape] = useState(false);

  const handleRun = async (url: string) => {
    setLoading(true);
    setError(null);
    setPdf(null);
    setBrowserMs(null);
    try {
      const result = await generatePdf({
        data: {
          url,
          pdfOptions: { format: pageFormat, landscape, printBackground: true },
        },
      });
      setPdf(result.pdf);
      setBrowserMs(result.browserMs);
    } catch (e: any) {
      setError(e.message || 'PDF generation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DemoPage
      title="PDF Generation"
      description="Generate a PDF document from any URL or custom HTML. Supports page format, orientation, and background printing options."
      endpoint="POST /pdf"
      apiCode={apiCode}
      pills={pills}
      info="The /pdf endpoint instructs the browser to generate a PDF of a webpage or custom HTML. Common use cases include generating invoices, licenses, reports, and certificates directly from HTML."
      onRun={handleRun}
      loading={loading}
      error={error}
      resultContent={
        pdf ? (
          <div>
            <ResultToolbar
              browserMs={browserMs}
              contentSize={pdf.length}
              contentLabel="PDF data"
              download={{ data: pdf, filename: 'rendered.pdf', mime: 'application/pdf' }}
            />
            <iframe
              src={pdf}
              className="w-full h-[600px] rounded-lg border border-cf-border mt-3"
              title="PDF preview"
            />
          </div>
        ) : undefined
      }
    >
      <div className="flex items-center gap-4 mb-4">
        <label className="flex items-center gap-2 text-sm text-cf-text">
          <span>Page Format:</span>
          <select value={pageFormat} onChange={(e) => setPageFormat(e.target.value)} className="px-3 py-1.5 rounded-lg border border-cf-border bg-white text-sm">
            <option value="A4">A4</option>
            <option value="Letter">Letter</option>
            <option value="Legal">Legal</option>
            <option value="A3">A3</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-cf-text cursor-pointer">
          <input type="checkbox" checked={landscape} onChange={(e) => setLandscape(e.target.checked)} className="rounded border-cf-border accent-cf-orange" />
          Landscape
        </label>
      </div>
      <UseCases
        cases={[
          { icon: <FileText size={18} />, title: 'Invoice Generation', description: 'Generate professional PDF invoices, receipts, and statements from HTML templates.' },
          { icon: <Receipt size={18} />, title: 'Report Export', description: 'Convert dashboards and analytics views into downloadable PDF reports.' },
          { icon: <GraduationCap size={18} />, title: 'Certificates & Tickets', description: 'Create personalized certificates, event tickets, or licenses from dynamic data.' },
        ]}
      />
    </DemoPage>
  );
}
