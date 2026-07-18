import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import PanelFooter from './PanelFooter';

afterEach(cleanup);

// The privacy badge is conditional: BYOK scores stay on-device / go direct;
// the free tier passes through our server, which keeps nothing.
describe('PanelFooter — conditional privacy badge', () => {
  it('BYOK (own key) → "On your device"', () => {
    render(<PanelFooter hasUserKey={true} />);
    expect(screen.getByText(/on your device/i)).toBeInTheDocument();
    expect(screen.queryByText(/processed, not stored/i)).not.toBeInTheDocument();
  });

  it('hosted (no key) → "Processed, not stored"', () => {
    render(<PanelFooter hasUserKey={false} />);
    expect(screen.getByText(/processed, not stored/i)).toBeInTheDocument();
    expect(screen.queryByText(/on your device/i)).not.toBeInTheDocument();
  });

  it('defaults to the free-tier wording (keyless install is the default)', () => {
    render(<PanelFooter />);
    expect(screen.getByText(/processed, not stored/i)).toBeInTheDocument();
  });
});
