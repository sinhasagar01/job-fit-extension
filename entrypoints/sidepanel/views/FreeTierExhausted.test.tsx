import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import FreeTierExhausted from './FreeTierExhausted';

afterEach(cleanup);

// Pin 3: an exhausted free tier is a calm two-path state, not an error toast.
describe('FreeTierExhausted', () => {
  it('offers two equal paths (own key / Pro soon) and is not an error toast', () => {
    render(<FreeTierExhausted onUseOwnKey={() => {}} onBack={() => {}} />);
    expect(screen.getByText(/at capacity/i)).toBeInTheDocument(); // calm header, not "error"
    expect(screen.getByRole('button', { name: /use your own key/i })).toBeInTheDocument();
    expect(screen.getByText(/soon/i)).toBeInTheDocument(); // the Pro path
    // No red error/toast styling anywhere.
    expect(document.querySelector('.text-bad')).toBeNull();
  });

  it('"use your own key" triggers the settings handler', () => {
    const onUseOwnKey = vi.fn();
    render(<FreeTierExhausted onUseOwnKey={onUseOwnKey} onBack={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /use your own key/i }));
    expect(onUseOwnKey).toHaveBeenCalledOnce();
  });
});
