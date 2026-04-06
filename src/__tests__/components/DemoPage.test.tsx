import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DemoPage from '../../components/DemoPage';

describe('DemoPage', () => {
  const defaultProps = {
    title: 'Screenshot',
    description: 'Capture a screenshot',
    endpoint: 'POST /screenshot',
    apiCode: 'curl -X POST ...',
    info: 'The screenshot endpoint renders a page.',
  };

  it('renders the title', () => {
    render(<DemoPage {...defaultProps} />);
    expect(screen.getByText('Screenshot')).toBeInTheDocument();
  });

  it('renders the description', () => {
    render(<DemoPage {...defaultProps} />);
    expect(screen.getByText('Capture a screenshot')).toBeInTheDocument();
  });

  it('renders the endpoint', () => {
    render(<DemoPage {...defaultProps} />);
    expect(screen.getByText('POST /screenshot')).toBeInTheDocument();
  });

  it('renders the info callout', () => {
    render(<DemoPage {...defaultProps} />);
    expect(
      screen.getByText('The screenshot endpoint renders a page.')
    ).toBeInTheDocument();
  });

  it('toggles API code visibility', async () => {
    const user = userEvent.setup();
    const { container } = render(<DemoPage {...defaultProps} />);

    // Code is hidden initially - no pre element visible
    expect(container.querySelector('pre')).toBeNull();

    // Click "Show API Code"
    await user.click(screen.getByText('Show API Code'));
    const pre = container.querySelector('pre');
    expect(pre).toBeInTheDocument();
    expect(pre!.textContent).toContain('curl');

    // Click "Hide API Code"
    await user.click(screen.getByText('Hide API Code'));
    expect(container.querySelector('pre')).toBeNull();
  });

  it('renders a URL input and Run button when no customForm is provided', () => {
    render(<DemoPage {...defaultProps} />);
    expect(screen.getByPlaceholderText('Enter a URL...')).toBeInTheDocument();
    expect(screen.getByText('Run')).toBeInTheDocument();
  });

  it('renders custom form when provided', () => {
    render(
      <DemoPage
        {...defaultProps}
        customForm={<div data-testid="custom-form">Custom Form</div>}
      />
    );
    expect(screen.getByTestId('custom-form')).toBeInTheDocument();
    // Should NOT render default URL input
    expect(
      screen.queryByPlaceholderText('Enter a URL...')
    ).not.toBeInTheDocument();
  });

  it('renders pill buttons', async () => {
    const user = userEvent.setup();
    const onRun = vi.fn();
    render(
      <DemoPage
        {...defaultProps}
        pills={[
          { label: 'example.com', value: 'https://example.com' },
          { label: 'cloudflare.com', value: 'https://cloudflare.com' },
        ]}
        onRun={onRun}
      />
    );

    expect(screen.getByText('example.com')).toBeInTheDocument();
    expect(screen.getByText('cloudflare.com')).toBeInTheDocument();

    // Clicking a pill should trigger onRun
    await user.click(screen.getByText('example.com'));
    expect(onRun).toHaveBeenCalledWith('https://example.com');
  });

  it('renders BETA badge when badge prop is set', () => {
    render(<DemoPage {...defaultProps} badge="beta" />);
    expect(screen.getByText('BETA')).toBeInTheDocument();
  });

  it('displays error message when error prop is set', () => {
    render(<DemoPage {...defaultProps} error="Something went wrong" />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('displays browser time when browserMs prop is set', () => {
    render(<DemoPage {...defaultProps} browserMs="450" />);
    expect(screen.getByText('450ms browser time')).toBeInTheDocument();
  });

  it('displays result content when provided', () => {
    render(
      <DemoPage
        {...defaultProps}
        resultContent={<div data-testid="result">Result content</div>}
      />
    );
    expect(screen.getByTestId('result')).toBeInTheDocument();
    expect(screen.getByText('Result')).toBeInTheDocument();
  });

  it('shows loading spinner when loading', () => {
    render(<DemoPage {...defaultProps} loading={true} />);
    expect(screen.getByText('Running')).toBeInTheDocument();
  });

  it('disables Run button when loading', () => {
    render(<DemoPage {...defaultProps} loading={true} />);
    const button = screen.getByText('Running').closest('button')!;
    expect(button).toBeDisabled();
  });

  it('calls onRun when Run button is clicked with URL', async () => {
    const user = userEvent.setup();
    const onRun = vi.fn();
    render(<DemoPage {...defaultProps} onRun={onRun} />);

    const input = screen.getByPlaceholderText('Enter a URL...');
    await user.type(input, 'https://example.com');
    await user.click(screen.getByText('Run'));

    expect(onRun).toHaveBeenCalledWith('https://example.com');
  });

  it('does not call onRun when URL is empty', async () => {
    const user = userEvent.setup();
    const onRun = vi.fn();
    render(<DemoPage {...defaultProps} onRun={onRun} />);

    await user.click(screen.getByText('Run'));
    expect(onRun).not.toHaveBeenCalled();
  });

  it('calls onRun on Enter key press', async () => {
    const user = userEvent.setup();
    const onRun = vi.fn();
    render(<DemoPage {...defaultProps} onRun={onRun} />);

    const input = screen.getByPlaceholderText('Enter a URL...');
    await user.type(input, 'https://example.com{Enter}');

    expect(onRun).toHaveBeenCalledWith('https://example.com');
  });

  it('renders children', () => {
    render(
      <DemoPage {...defaultProps}>
        <div data-testid="child">Extra options</div>
      </DemoPage>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });
});
