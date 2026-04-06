import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatusBadge from '../../components/StatusBadge';

describe('StatusBadge', () => {
  it('renders with "ready" status', () => {
    render(<StatusBadge status="ready" />);
    expect(screen.getByText('Ready')).toBeInTheDocument();
  });

  it('renders with "loading" status', () => {
    render(<StatusBadge status="loading" />);
    expect(screen.getByText('Loading')).toBeInTheDocument();
  });

  it('renders with "success" status', () => {
    render(<StatusBadge status="success" />);
    expect(screen.getByText('Success')).toBeInTheDocument();
  });

  it('renders with "error" status', () => {
    render(<StatusBadge status="error" />);
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('renders with "beta" status', () => {
    render(<StatusBadge status="beta" />);
    expect(screen.getByText('Beta')).toBeInTheDocument();
  });

  it('renders custom label', () => {
    render(<StatusBadge status="success" label="200ms browser time" />);
    expect(screen.getByText('200ms browser time')).toBeInTheDocument();
  });

  it('renders different styles for ready vs error status', () => {
    const { container: readyContainer } = render(<StatusBadge status="ready" />);
    const { container: errorContainer } = render(<StatusBadge status="error" />);
    const readyClass = readyContainer.firstElementChild!.className;
    const errorClass = errorContainer.firstElementChild!.className;
    // Different statuses should produce different class outputs
    expect(readyClass).not.toBe(errorClass);
  });

  it('renders a dot indicator element inside the badge', () => {
    const { container } = render(<StatusBadge status="ready" />);
    const dot = container.querySelector('span span');
    expect(dot).toBeInTheDocument();
  });

  it('renders beta status with distinctive styling', () => {
    const { container: betaContainer } = render(<StatusBadge status="beta" label="BETA" />);
    const { container: readyContainer } = render(<StatusBadge status="ready" />);
    expect(betaContainer.firstElementChild!.className).not.toBe(
      readyContainer.firstElementChild!.className
    );
  });

  it('applies pulse animation for loading status', () => {
    const { container } = render(<StatusBadge status="loading" />);
    const dot = container.querySelector('.animate-pulse');
    expect(dot).toBeInTheDocument();
  });

  it('does not apply pulse animation for non-loading status', () => {
    const { container } = render(<StatusBadge status="success" />);
    const dot = container.querySelector('.animate-pulse');
    expect(dot).not.toBeInTheDocument();
  });
});
