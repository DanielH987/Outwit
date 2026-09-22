// CountryFlag: renders the flag emoji for a valid code, nothing otherwise.
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CountryFlag } from '../components/CountryFlag';

describe('CountryFlag', () => {
  it('renders a flag for a valid code', () => {
    render(<CountryFlag code="US" />);
    expect(screen.getByTestId('country-flag')).toHaveTextContent('🇺🇸');
    expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'US');
  });

  it('renders nothing for an unknown or missing code', () => {
    const { container } = render(<CountryFlag code={null} />);
    expect(container.firstChild).toBeNull();
  });
});
