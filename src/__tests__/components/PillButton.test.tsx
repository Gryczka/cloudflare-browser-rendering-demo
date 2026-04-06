import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PillButton from '../../components/PillButton';

describe('PillButton', () => {
  it('renders the label', () => {
    render(<PillButton label="example.com" onClick={() => {}} />);
    expect(screen.getByText('example.com')).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<PillButton label="Click me" onClick={onClick} />);

    await user.click(screen.getByText('Click me'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('applies different styles when active vs inactive', () => {
    const { unmount } = render(
      <PillButton label="Active" onClick={() => {}} active={true} />
    );
    const activeClass = screen.getByText('Active').className;
    unmount();

    render(
      <PillButton label="Inactive" onClick={() => {}} active={false} />
    );
    const inactiveClass = screen.getByText('Inactive').className;

    expect(activeClass).not.toBe(inactiveClass);
  });

  it('defaults to inactive style when active prop is not provided', () => {
    const { unmount } = render(
      <PillButton label="Inactive" onClick={() => {}} active={false} />
    );
    const inactiveClass = screen.getByText('Inactive').className;
    unmount();

    render(<PillButton label="Default" onClick={() => {}} />);
    const defaultClass = screen.getByText('Default').className;

    expect(defaultClass).toBe(inactiveClass);
  });
});
