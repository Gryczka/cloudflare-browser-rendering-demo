#!/usr/bin/env node
/**
 * Guards against Tailwind classes that compile to nothing.
 *
 * `src/styles.css` starts with `--color-*: initial`, which removes Tailwind's
 * entire default palette. Any class referencing a token that was not
 * re-declared in the `@theme` block still appears in the HTML but produces no
 * CSS rule, so it fails silently — no build error, no console warning, just an
 * element with no background or an invisible label.
 *
 * That is exactly how `bg-white`, `bg-gray-100` and `bg-cf-code-bg` ended up
 * live in production with zero matching rules. This script compares every class
 * token used in the source against the class selectors actually present in the
 * built stylesheet and fails if any are missing.
 *
 * Usage:
 *   npm run build && npm run check:css
 */

import { readFile, readdir } from 'node:fs/promises';
import { join, extname } from 'node:path';

const SRC_DIR = 'src';
const CSS_GLOB_DIR = 'dist/client/assets';

/**
 * Class tokens that legitimately have no CSS rule of their own.
 * Keep this list short and justified — each entry is a suppressed check.
 */
const ALLOWED_WITHOUT_RULE = new Set([
  'group', // marker class for group-* variants; emits no rule itself
  'peer', // ditto for peer-*
  'prose', // typography plugin is not installed; used decoratively
  'prose-sm',
]);

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '__tests__') continue;
      out.push(...(await walk(full)));
    } else if (['.tsx', '.ts'].includes(extname(entry.name))) {
      out.push(full);
    }
  }
  return out;
}

/** Collect class tokens from className="..." / className={`...`} literals. */
function extractClassTokens(source) {
  const tokens = new Set();

  // className="..."  |  className={'...'}  |  className={`...`}
  const attrPattern =
    /className\s*=\s*(?:"([^"]*)"|'([^']*)'|\{`([^`]*)`\}|\{'([^']*)'\}|\{"([^"]*)"\})/g;

  // Any quoted string inside a className={...} expression (ternaries etc.)
  const exprPattern = /className\s*=\s*\{([\s\S]*?)\}\s*(?=\n|\/?>|\s[a-zA-Z-]+=)/g;

  const harvest = (text) => {
    if (!text) return;
    for (const raw of text.split(/\s+/)) {
      // Ternaries inside template literals leave quote and brace crumbs on the
      // first and last token of each branch, e.g. `'bg-cf-orange` and
      // `text-cf-text'}`. Strip them before classifying.
      const token = raw.trim().replace(/^[`'"{[]*(?=[a-zA-Z!.[-])/, '').replace(/[`'"}\])]*$/, (m, offset, s) =>
        // Keep a trailing ] that closes an arbitrary value like bg-[#fff].
        s.slice(0, offset).includes('[') && m.startsWith(']') ? ']' : ''
      );

      if (!token) continue;

      // Expression fragments, not classes.
      if (/[$=(),.]/.test(token)) continue;
      if (/[A-Z]/.test(token)) continue; // Tailwind utilities are lowercase
      if (!/^[a-z[!-]/.test(token)) continue;

      // Only flag things that actually look like utilities. Bare single words
      // are usually identifiers from a ternary condition; if such a word really
      // were a utility in use, Tailwind would have emitted a rule for it and it
      // would never be reported anyway.
      if (!/[-:[]/.test(token)) continue;

      tokens.add(token);
    }
  };

  let match;
  while ((match = attrPattern.exec(source))) {
    harvest(match[1] ?? match[2] ?? match[3] ?? match[4] ?? match[5]);
  }
  while ((match = exprPattern.exec(source))) {
    for (const str of match[1].match(/(['"`])((?:\\.|(?!\1)[^\\])*)\1/g) ?? []) {
      harvest(str.slice(1, -1));
    }
  }

  return tokens;
}

/** Every class selector defined in the built CSS, unescaped. */
function extractDefinedClasses(css) {
  const defined = new Set();
  // Matches .foo, .hover\:bg-x, .max-h-\[500px\], .md\:grid-cols-4 ...
  const pattern = /\.((?:\\.|[a-zA-Z0-9_-])+)/g;
  let match;
  while ((match = pattern.exec(css))) {
    defined.add(match[1].replace(/\\(.)/g, '$1'));
  }
  return defined;
}

async function readBuiltCss() {
  let files;
  try {
    files = await readdir(CSS_GLOB_DIR);
  } catch {
    console.error(
      `✗ ${CSS_GLOB_DIR} not found. Run \`npm run build\` before \`npm run check:css\`.`
    );
    process.exit(2);
  }
  const cssFiles = files.filter((f) => f.endsWith('.css'));
  if (cssFiles.length === 0) {
    console.error(`✗ No .css files in ${CSS_GLOB_DIR}.`);
    process.exit(2);
  }
  const contents = await Promise.all(
    cssFiles.map((f) => readFile(join(CSS_GLOB_DIR, f), 'utf8'))
  );
  return { css: contents.join('\n'), cssFiles };
}

const { css, cssFiles } = await readBuiltCss();
const defined = extractDefinedClasses(css);

const files = await walk(SRC_DIR);
const orphans = new Map(); // token -> Set<file>

for (const file of files) {
  const source = await readFile(file, 'utf8');
  for (const token of extractClassTokens(source)) {
    // Strip a leading ! (important modifier) before comparing.
    const bare = token.replace(/^!/, '');
    if (ALLOWED_WITHOUT_RULE.has(bare)) continue;
    if (defined.has(bare)) continue;

    // Arbitrary-value utilities are emitted with escaped selectors that the
    // unescape above already handles; if it is still missing, it is a real gap.
    if (!orphans.has(bare)) orphans.set(bare, new Set());
    orphans.get(bare).add(file);
  }
}

console.log(
  `Checked ${files.length} source files against ${cssFiles.join(', ')} ` +
    `(${defined.size} class selectors defined).`
);

if (orphans.size === 0) {
  console.log('✓ No orphan Tailwind classes.');
  process.exit(0);
}

console.error(`\n✗ ${orphans.size} class(es) used in source but absent from the built CSS:\n`);
for (const [token, where] of [...orphans].sort()) {
  console.error(`  ${token}`);
  for (const file of [...where].sort()) console.error(`      ${file}`);
}
console.error(
  '\nEither define the missing token in the @theme block of src/styles.css, ' +
    'or change the usage to an existing token.\n'
);
process.exit(1);
