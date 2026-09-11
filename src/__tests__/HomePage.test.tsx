import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HomePage } from '../pages/HomePage';

function renderWithRouter() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>
  );
}

describe('HomePage', () => {
  it('renders the Outwit heading', () => {
    renderWithRouter();
    expect(screen.getByRole('heading', { name: /Outwit/i })).toBeInTheDocument();
  });

  it('has a link to the lobby', () => {
    renderWithRouter();
    expect(screen.getByRole('link', { name: /Play Now/i })).toHaveAttribute('href', '/lobby');
  });
});
