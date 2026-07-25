import { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import type { AccessibilityNode } from '../server/browser-rendering';

/**
 * Collapsible viewer for a Chrome accessibility tree.
 *
 * Rendered on a dark surface to match the other output panels, so all colours
 * here are from the surface-dark ramp.
 */
export default function AccessibilityTreeView({
  node,
  depth = 0,
}: {
  node: AccessibilityNode;
  depth?: number;
}) {
  // Expand the first few levels by default; deep trees get noisy fast.
  const [open, setOpen] = useState(depth < 2);
  const children = node.children ?? [];
  const hasChildren = children.length > 0;

  return (
    <div className={depth > 0 ? 'ml-4 border-l border-surface-dark-border pl-3' : ''}>
      <div className="flex items-start gap-1.5 py-0.5 font-mono text-xs leading-relaxed">
        {hasChildren ? (
          <button
            onClick={() => setOpen((v) => !v)}
            className="mt-0.5 cursor-pointer text-surface-dark-dim transition-colors hover:text-surface-dark-text"
            aria-label={open ? 'Collapse' : 'Expand'}
          >
            {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
        ) : (
          <span className="w-3 shrink-0" />
        )}

        <span className="shrink-0 text-surface-dark-info">{node.role}</span>

        {node.name ? (
          <span className="text-surface-dark-success">
            &ldquo;{truncate(node.name, 120)}&rdquo;
          </span>
        ) : null}

        {node.value ? (
          <span className="text-surface-dark-muted">= {truncate(node.value, 60)}</span>
        ) : null}

        {node.level != null ? (
          <span className="text-surface-dark-dim">level {node.level}</span>
        ) : null}

        {hasChildren && !open ? (
          <span className="text-surface-dark-dim">
            ({children.length} child{children.length === 1 ? '' : 'ren'})
          </span>
        ) : null}
      </div>

      {open &&
        children.map((child, i) => (
          <AccessibilityTreeView key={i} node={child} depth={depth + 1} />
        ))}
    </div>
  );
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

/** Count every node in the tree, for the result summary. */
export function countNodes(node: AccessibilityNode | null): number {
  if (!node) return 0;
  return 1 + (node.children ?? []).reduce((sum, c) => sum + countNodes(c), 0);
}
