import { createServerFn } from '@tanstack/react-start';

// In Cloudflare Workers, env is passed through the module worker's fetch handler.
// With @cloudflare/vite-plugin + TanStack Start, we access it via process.env
// which is shimmed in the Workers runtime.
function getEnvVar(name: string): string {
  const val = (process as any).env[name] || '';
  if (!val) {
    throw new Error(
      `Missing environment variable: ${name}. ` +
        `Available keys: ${Object.keys((process as any).env || {}).join(', ')}. ` +
        `Please set it in wrangler.jsonc or via wrangler secret put.`
    );
  }
  return val;
}


function getBaseUrl(): string {
  const accountId = getEnvVar('CF_ACCOUNT_ID');
  return `https://api.cloudflare.com/client/v4/accounts/${accountId}/browser-rendering`;
}

function getHeaders(): Record<string, string> {
  const apiToken = getEnvVar('CF_API_TOKEN');
  return {
    Authorization: `Bearer ${apiToken}`,
    'Content-Type': 'application/json',
  };
}

// ─── Screenshot ──────────────────────────────────────────────────────
export const takeScreenshot = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      url?: string;
      html?: string;
      screenshotOptions?: {
        type?: 'png' | 'webp' | 'jpeg';
        fullPage?: boolean;
        omitBackground?: boolean;
      };
      viewport?: { width?: number; height?: number };
    }) => data
  )
  .handler(async ({ data }) => {
    const body: Record<string, unknown> = {};
    if (data.url) body.url = data.url;
    if (data.html) body.html = data.html;
    if (data.screenshotOptions) body.screenshotOptions = data.screenshotOptions;
    if (data.viewport) body.viewport = data.viewport;

    const resp = await fetch(`${getBaseUrl()}/screenshot`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Screenshot failed (${resp.status}): ${text}`);
    }

    const arrayBuffer = await resp.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce(
        (str, byte) => str + String.fromCharCode(byte),
        ''
      )
    );
    const contentType = resp.headers.get('content-type') || 'image/png';
    return {
      image: `data:${contentType};base64,${base64}`,
      browserMs: resp.headers.get('x-browser-ms-used'),
    };
  });

// ─── PDF ─────────────────────────────────────────────────────────────
export const generatePdf = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      url?: string;
      html?: string;
      pdfOptions?: {
        format?: string;
        landscape?: boolean;
        printBackground?: boolean;
      };
    }) => data
  )
  .handler(async ({ data }) => {
    const body: Record<string, unknown> = {};
    if (data.url) body.url = data.url;
    if (data.html) body.html = data.html;
    if (data.pdfOptions) body.pdfOptions = data.pdfOptions;

    const resp = await fetch(`${getBaseUrl()}/pdf`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`PDF generation failed (${resp.status}): ${text}`);
    }

    const arrayBuffer = await resp.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce(
        (str, byte) => str + String.fromCharCode(byte),
        ''
      )
    );
    return {
      pdf: `data:application/pdf;base64,${base64}`,
      browserMs: resp.headers.get('x-browser-ms-used'),
    };
  });

// ─── Content (HTML) ──────────────────────────────────────────────────
export const fetchContent = createServerFn({ method: 'POST' })
  .inputValidator((data: { url: string }) => data)
  .handler(async ({ data }) => {
    const resp = await fetch(`${getBaseUrl()}/content`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ url: data.url }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Content fetch failed (${resp.status}): ${text}`);
    }

    const html = await resp.text();
    return {
      html,
      browserMs: resp.headers.get('x-browser-ms-used'),
    };
  });

// ─── Markdown ────────────────────────────────────────────────────────
export const fetchMarkdown = createServerFn({ method: 'POST' })
  .inputValidator((data: { url: string }) => data)
  .handler(async ({ data }) => {
    const resp = await fetch(`${getBaseUrl()}/markdown`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ url: data.url }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Markdown fetch failed (${resp.status}): ${text}`);
    }

    const text = await resp.text();
    return {
      markdown: text,
      browserMs: resp.headers.get('x-browser-ms-used'),
    };
  });

// ─── Scrape ──────────────────────────────────────────────────────────
export const scrapeContent = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: { url: string; elements: Array<{ selector: string }> }) => data
  )
  .handler(async ({ data }) => {
    const resp = await fetch(`${getBaseUrl()}/scrape`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        url: data.url,
        elements: data.elements,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Scrape failed (${resp.status}): ${text}`);
    }

    const json = (await resp.json()) as Record<string, any>;
    return {
      result: json as Record<string, any>,
      browserMs: resp.headers.get('x-browser-ms-used'),
    };
  });

// ─── JSON (AI extraction) ────────────────────────────────────────────
export const extractJson = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      url: string;
      prompt?: string;
      response_format?: {
        type: string;
        schema: Record<string, unknown>;
      };
    }) => data
  )
  .handler(async ({ data }) => {
    const body: Record<string, unknown> = { url: data.url };
    if (data.prompt) body.prompt = data.prompt;
    if (data.response_format) body.response_format = data.response_format;

    const resp = await fetch(`${getBaseUrl()}/json`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`JSON extraction failed (${resp.status}): ${text}`);
    }

    const json = (await resp.json()) as Record<string, any>;
    return {
      result: json,
      browserMs: resp.headers.get('x-browser-ms-used'),
    };
  });

// ─── Links ───────────────────────────────────────────────────────────
export const fetchLinks = createServerFn({ method: 'POST' })
  .inputValidator((data: { url: string }) => data)
  .handler(async ({ data }) => {
    const resp = await fetch(`${getBaseUrl()}/links`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ url: data.url }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Links fetch failed (${resp.status}): ${text}`);
    }

    const json = (await resp.json()) as Record<string, any>;
    return {
      result: json,
      browserMs: resp.headers.get('x-browser-ms-used'),
    };
  });

// ─── Snapshot ────────────────────────────────────────────────────────
export const takeSnapshot = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      url: string;
      screenshotOptions?: { type?: 'png' | 'webp' | 'jpeg' };
    }) => data
  )
  .handler(async ({ data }) => {
    const body: Record<string, unknown> = { url: data.url };
    if (data.screenshotOptions) body.screenshotOptions = data.screenshotOptions;

    const resp = await fetch(`${getBaseUrl()}/snapshot`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Snapshot failed (${resp.status}): ${text}`);
    }

    const json = (await resp.json()) as {
      screenshot?: string;
      content?: string;
    };

    return {
      screenshot: json.screenshot
        ? `data:image/png;base64,${json.screenshot}`
        : null,
      html: json.content || null,
      browserMs: resp.headers.get('x-browser-ms-used'),
    };
  });

// ─── Crawl (Start) ──────────────────────────────────────────────────
export const startCrawl = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      url: string;
      limit?: number;
      depth?: number;
      formats?: string[];
      render?: boolean;
      source?: string;
      jsonOptions?: {
        prompt?: string;
        response_format?: Record<string, any>;
      };
      options?: {
        includeExternalLinks?: boolean;
        includeSubdomains?: boolean;
        includePatterns?: string[];
        excludePatterns?: string[];
      };
    }) => data
  )
  .handler(async ({ data }) => {
    const body: Record<string, unknown> = { url: data.url };
    if (data.limit !== undefined) body.limit = data.limit;
    if (data.depth !== undefined) body.depth = data.depth;
    if (data.formats) body.formats = data.formats;
    if (data.render !== undefined) body.render = data.render;
    if (data.source) body.source = data.source;
    if (data.jsonOptions) body.jsonOptions = data.jsonOptions;
    if (data.options) body.options = data.options;

    const resp = await fetch(`${getBaseUrl()}/crawl`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Crawl start failed (${resp.status}): ${text}`);
    }

    const json = (await resp.json()) as Record<string, any>;
    return {
      result: json,
      browserMs: resp.headers.get('x-browser-ms-used'),
    };
  });

// ─── Crawl (Check Status) ───────────────────────────────────────────
export const getCrawlStatus = createServerFn({ method: 'POST' })
  .inputValidator((data: { jobId: string; status?: string }) => data)
  .handler(async ({ data }) => {
    let url = `${getBaseUrl()}/crawl/${data.jobId}`;
    if (data.status) url += `?status=${data.status}`;

    const apiToken = getEnvVar('CF_API_TOKEN');
    const resp = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Crawl status check failed (${resp.status}): ${text}`);
    }

    const json = (await resp.json()) as Record<string, any>;
    return {
      result: json,
      browserMs: resp.headers.get('x-browser-ms-used'),
    };
  });
