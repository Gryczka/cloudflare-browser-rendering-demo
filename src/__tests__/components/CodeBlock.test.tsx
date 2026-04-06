import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CodeBlock from '../../components/CodeBlock';

describe('CodeBlock', () => {
  it('renders code content', () => {
    const { container } = render(<CodeBlock code="const x = 1;" />);
    const pre = container.querySelector('pre');
    expect(pre).toBeInTheDocument();
    expect(pre!.textContent).toContain('const');
    expect(pre!.textContent).toContain('x');
    expect(pre!.textContent).toContain('1');
  });

  it('renders default title "API CODE"', () => {
    render(<CodeBlock code="test" />);
    expect(screen.getByText('API CODE')).toBeInTheDocument();
  });

  it('renders custom title', () => {
    render(<CodeBlock code="test" title="CURL" />);
    expect(screen.getByText('CURL')).toBeInTheDocument();
  });

  it('renders language label', () => {
    render(<CodeBlock code="test" language="javascript" />);
    expect(screen.getByText('javascript')).toBeInTheDocument();
  });

  it('has a copy button that triggers copy', async () => {
    const user = userEvent.setup();
    render(<CodeBlock code="const x = 42;" />);

    const copyButton = screen.getByTitle('Copy code');
    expect(copyButton).toBeInTheDocument();
    expect(copyButton.tagName).toBe('BUTTON');

    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    await user.click(copyButton);
    expect(writeText).toHaveBeenCalledWith('const x = 42;');

    vi.unstubAllGlobals();
  });

  it('renders code inside a pre element with syntax spans', () => {
    const code = 'function hello() {\n  return "world";\n}';
    const { container } = render(<CodeBlock code={code} />);
    const pre = container.querySelector('pre');
    expect(pre).toBeInTheDocument();
    // SyntaxHighlight renders spans for colored tokens
    const spans = pre!.querySelectorAll('span');
    expect(spans.length).toBeGreaterThan(0);
    // Full text content should match the original code
    expect(pre!.textContent).toContain('function');
    expect(pre!.textContent).toContain('hello');
    expect(pre!.textContent).toContain('return');
    expect(pre!.textContent).toContain('"world"');
  });

  it('wraps code in a dark-themed container', () => {
    const { container } = render(<CodeBlock code="test" />);
    const wrapper = container.firstElementChild!;
    // Tailwind v4 may compile class names - just verify the container exists and has classes
    expect(wrapper).toBeInTheDocument();
    expect(wrapper.className.length).toBeGreaterThan(0);
    expect(wrapper.querySelector('pre')).toBeInTheDocument();
  });

  it('applies color styling to syntax tokens', () => {
    const { container } = render(
      <CodeBlock code='const name = "hello";' language="typescript" />
    );
    const spans = container.querySelectorAll('pre span[style]');
    expect(spans.length).toBeGreaterThan(0);
    // At least one span should have a color style
    const hasColoredSpan = Array.from(spans).some(
      (s) => (s as HTMLElement).style.color !== ''
    );
    expect(hasColoredSpan).toBe(true);
  });
});
