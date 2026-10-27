import {
  assertPublicHttpUrl,
  assertSelectors,
  InvalidInputError,
} from './guards';

function object(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    throw new InvalidInputError('Expected an options object');
  return raw as Record<string, unknown>;
}
function enumValue(raw: unknown, values: string[]): string {
  if (typeof raw !== 'string' || !values.includes(raw))
    throw new InvalidInputError('Unsupported action option');
  return raw;
}
function boolean(raw: unknown): boolean {
  if (typeof raw !== 'boolean')
    throw new InvalidInputError('Expected a boolean option');
  return raw;
}

/** Allowlist provider options, reject raw HTML, and bound every serialized payload. */
export function checkedAction(
  path: string,
  raw: Record<string, unknown>,
): Record<string, unknown> {
  if (new TextEncoder().encode(JSON.stringify(raw)).byteLength > 16_384)
    throw new InvalidInputError('Action body exceeds demo limits');
  if (raw.html !== undefined)
    throw new InvalidInputError(
      'Raw HTML rendering is disabled in the public demo; use a public URL.',
    );
  const result: Record<string, unknown> = {
    ...raw,
    url: assertPublicHttpUrl(raw.url),
  };
  if (raw.viewport !== undefined) {
    const viewport = object(raw.viewport);
    result.viewport = Object.fromEntries(
      ['width', 'height']
        .filter((key) => viewport[key] !== undefined)
        .map((key) => {
          const value = viewport[key];
          if (typeof value !== 'number' || !Number.isFinite(value) || value < 1)
            throw new InvalidInputError('Invalid viewport');
          return [
            key,
            Math.min(Math.floor(value), key === 'width' ? 1440 : 900),
          ];
        }),
    );
  }
  if (raw.screenshotOptions !== undefined) {
    const options = object(raw.screenshotOptions);
    result.screenshotOptions = {
      ...(options.type === undefined
        ? {}
        : { type: enumValue(options.type, ['png', 'jpeg', 'webp']) }),
      ...(options.fullPage === undefined
        ? {}
        : { fullPage: boolean(options.fullPage) }),
      ...(options.omitBackground === undefined
        ? {}
        : { omitBackground: boolean(options.omitBackground) }),
    };
  }
  if (raw.pdfOptions !== undefined) {
    const options = object(raw.pdfOptions);
    result.pdfOptions = {
      ...(options.format === undefined
        ? {}
        : {
            format: enumValue(options.format, [
              'A4',
              'Letter',
              'Legal',
              'A3',
              'A5',
            ]),
          }),
      ...(options.landscape === undefined
        ? {}
        : { landscape: boolean(options.landscape) }),
      ...(options.printBackground === undefined
        ? {}
        : { printBackground: boolean(options.printBackground) }),
    };
  }
  if (path === '/scrape') result.elements = assertSelectors(raw.elements);
  if (
    raw.prompt !== undefined &&
    (typeof raw.prompt !== 'string' || raw.prompt.length > 2_000)
  )
    throw new InvalidInputError('Prompt exceeds demo limits');
  if (raw.response_format !== undefined) {
    const format = object(raw.response_format);
    if (format.type !== 'json_schema' || JSON.stringify(format).length > 4_096)
      throw new InvalidInputError('Invalid or oversized response schema');
    result.response_format = {
      type: 'json_schema',
      json_schema: object(format.json_schema),
    };
  }
  if (raw.jsonOptions !== undefined) {
    const options = object(raw.jsonOptions);
    const checked = checkedAction('/json', { url: result.url, ...options });
    result.jsonOptions = {
      ...(checked.prompt === undefined ? {} : { prompt: checked.prompt }),
      ...(checked.response_format === undefined
        ? {}
        : { response_format: checked.response_format }),
    };
  }
  if (path !== '/crawl' || raw.render === true)
    result.gotoOptions = { waitUntil: 'domcontentloaded', timeout: 15_000 };
  return result;
}
