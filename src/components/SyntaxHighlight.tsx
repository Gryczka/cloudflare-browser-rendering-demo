/**
 * Lightweight syntax highlighter for JS/TS, HTML, and JSON.
 * No external dependencies - uses regex tokenization with CF theme colors.
 */

type Language = 'javascript' | 'typescript' | 'html' | 'json' | 'markdown' | 'text';

interface SyntaxHighlightProps {
  code: string;
  language?: Language;
  className?: string;
}

// ── Token types and their colors (CF theme) ──────────────────────
const colors = {
  keyword: '#9616ff',    // cf-ai purple
  control: '#9616ff',
  declaration: '#2563eb', // cf-info blue
  string: '#16a34a',     // cf-success green
  template: '#16a34a',
  comment: 'oklch(from #521000 l c h / 56%)', // cf-text-subtle
  function: '#eab308',   // cf-warning yellow
  type: '#2563eb',       // cf-info blue
  property: '#ff4801',   // cf-orange
  number: '#16a34a',     // cf-success green
  boolean: '#2563eb',
  null: '#2563eb',
  operator: 'oklch(from #521000 l c h / 78%)', // cf-text-muted
  punctuation: 'oklch(from #521000 l c h / 56%)',
  tag: '#2563eb',
  attrName: '#ff4801',
  attrValue: '#16a34a',
  entity: '#eab308',
  text: '#f5ede0',       // surface-dark-text
  key: '#ff4801',        // cf-orange
} as const;

// ── Highlighter functions ─────────────────────────────────────────

function highlightJSON(code: string): Array<{ text: string; color: string }> {
  const tokens: Array<{ text: string; color: string }> = [];
  const regex =
    /("(?:[^"\\]|\\.)*")\s*(:)|("(?:[^"\\]|\\.)*")|([-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|(\btrue\b|\bfalse\b)|(\bnull\b)|([{}\[\],])|(\s+)|(.)/g;
  let match;
  while ((match = regex.exec(code)) !== null) {
    if (match[1]) {
      tokens.push({ text: match[1], color: colors.key });
      tokens.push({ text: match[2], color: colors.punctuation });
    } else if (match[3]) {
      tokens.push({ text: match[3], color: colors.string });
    } else if (match[4]) {
      tokens.push({ text: match[4], color: colors.number });
    } else if (match[5]) {
      tokens.push({ text: match[5], color: colors.boolean });
    } else if (match[6]) {
      tokens.push({ text: match[6], color: colors.null });
    } else if (match[7]) {
      tokens.push({ text: match[7], color: colors.punctuation });
    } else if (match[8]) {
      tokens.push({ text: match[8], color: colors.text });
    } else if (match[9]) {
      tokens.push({ text: match[9], color: colors.text });
    }
  }
  return tokens;
}

function highlightHTML(code: string): Array<{ text: string; color: string }> {
  const tokens: Array<{ text: string; color: string }> = [];
  const regex =
    /(<!--[\s\S]*?-->)|(<\/?)([\w-]+)((?:\s+[\w-]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*))?)*)\s*(\/?>)|(&\w+;|&#\d+;)|([^<&]+)/g;
  let match;
  while ((match = regex.exec(code)) !== null) {
    if (match[1]) {
      tokens.push({ text: match[1], color: colors.comment });
    } else if (match[2]) {
      tokens.push({ text: match[2], color: colors.punctuation });
      tokens.push({ text: match[3], color: colors.tag });
      if (match[4]) {
        const attrStr = match[4];
        const attrRegex =
          /([\w-]+)(\s*=\s*)?("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|[^\s>]*)?/g;
        let attrMatch;
        let lastIndex = 0;
        while ((attrMatch = attrRegex.exec(attrStr)) !== null) {
          if (attrMatch.index > lastIndex) {
            tokens.push({
              text: attrStr.slice(lastIndex, attrMatch.index),
              color: colors.text,
            });
          }
          tokens.push({ text: attrMatch[1], color: colors.attrName });
          if (attrMatch[2]) {
            tokens.push({ text: attrMatch[2], color: colors.operator });
          }
          if (attrMatch[3]) {
            tokens.push({ text: attrMatch[3], color: colors.attrValue });
          }
          lastIndex = attrMatch.index + attrMatch[0].length;
        }
        if (lastIndex < attrStr.length) {
          tokens.push({ text: attrStr.slice(lastIndex), color: colors.text });
        }
      }
      tokens.push({ text: match[5], color: colors.punctuation });
    } else if (match[6]) {
      tokens.push({ text: match[6], color: colors.entity });
    } else if (match[7]) {
      tokens.push({ text: match[7], color: colors.text });
    }
  }
  return tokens;
}

function highlightJS(code: string): Array<{ text: string; color: string }> {
  const tokens: Array<{ text: string; color: string }> = [];
  const regex =
    /(\/\/.*$|\/\*[\s\S]*?\*\/)|(`(?:[^`\\]|\\[\s\S])*`)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|\b(const|let|var|function|class|return|import|export|from|default|async|await|new|typeof|instanceof|if|else|for|while|do|switch|case|break|continue|throw|try|catch|finally|yield)\b|\b(true|false)\b|\b(null|undefined|NaN|Infinity)\b|\b(interface|type|enum|extends|implements|declare|as|keyof|readonly)\b|(\.)([\w$]+)(\s*\()|(\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b|([\w$]+)(\s*\()|([{}()\[\];,])|([=+\-*/<>!&|?:%.~^]+)|(\s+)|([\w$]+)/gm;
  let match;
  while ((match = regex.exec(code)) !== null) {
    if (match[1]) {
      tokens.push({ text: match[1], color: colors.comment });
    } else if (match[2]) {
      tokens.push({ text: match[2], color: colors.template });
    } else if (match[3]) {
      tokens.push({ text: match[3], color: colors.string });
    } else if (match[4]) {
      tokens.push({ text: match[4], color: colors.keyword });
    } else if (match[5]) {
      tokens.push({ text: match[5], color: colors.boolean });
    } else if (match[6]) {
      tokens.push({ text: match[6], color: colors.null });
    } else if (match[7]) {
      tokens.push({ text: match[7], color: colors.type });
    } else if (match[8] && match[9] && match[10]) {
      tokens.push({ text: match[8], color: colors.operator });
      tokens.push({ text: match[9], color: colors.function });
      tokens.push({ text: match[10], color: colors.punctuation });
    } else if (match[11]) {
      tokens.push({ text: match[11], color: colors.number });
    } else if (match[12] && match[13]) {
      tokens.push({ text: match[12], color: colors.function });
      tokens.push({ text: match[13], color: colors.punctuation });
    } else if (match[14]) {
      tokens.push({ text: match[14], color: colors.punctuation });
    } else if (match[15]) {
      tokens.push({ text: match[15], color: colors.operator });
    } else if (match[16]) {
      tokens.push({ text: match[16], color: colors.text });
    } else if (match[17]) {
      tokens.push({ text: match[17], color: colors.property });
    }
  }
  return tokens;
}

function tokenize(
  code: string,
  language: Language
): Array<{ text: string; color: string }> {
  if (language === 'json') return highlightJSON(code);
  if (language === 'html') return highlightHTML(code);
  if (language === 'javascript' || language === 'typescript')
    return highlightJS(code);
  return [{ text: code, color: colors.text }];
}

export default function SyntaxHighlight({
  code,
  language = 'text',
  className = '',
}: SyntaxHighlightProps) {
  if (language === 'text' || language === 'markdown') {
    return (
      <pre
        className={`text-surface-dark-text font-mono whitespace-pre-wrap ${className}`}
      >
        {code}
      </pre>
    );
  }

  const tokens = tokenize(code, language);

  return (
    <pre className={`font-mono whitespace-pre-wrap ${className}`}>
      {tokens.map((token, i) => (
        <span key={i} style={{ color: token.color }}>
          {token.text}
        </span>
      ))}
    </pre>
  );
}

export { type Language };
