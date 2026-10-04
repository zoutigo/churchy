import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotFoundPage } from './NotFoundPage';
import { ServerErrorPage } from './ServerErrorPage';

describe('NotFoundPage', () => {
  it('affiche 404, un titre, un message et le lien principal vers l’accueil par défaut', () => {
    render(<NotFoundPage />);
    expect(screen.getByRole('heading', { name: 'Page introuvable' })).toBeInTheDocument();
    expect(screen.getByTestId('error-page')).toHaveAttribute('data-kind', 'not-found');
    expect(screen.getByRole('link', { name: 'Retour à l’accueil' })).toHaveAttribute('href', '/fr');
  });

  it('accepte des liens de sortie adaptés à l’endroit', () => {
    render(
      <NotFoundPage
        primary={{ href: '/dashboard', label: 'Tableau de bord' }}
        secondary={{ href: '/dashboard/parishes', label: 'Mes paroisses' }}
      />,
    );
    expect(screen.getByRole('link', { name: 'Tableau de bord' })).toHaveAttribute(
      'href',
      '/dashboard',
    );
    expect(screen.getByRole('link', { name: 'Mes paroisses' })).toHaveAttribute(
      'href',
      '/dashboard/parishes',
    );
  });
});

describe('ServerErrorPage', () => {
  it('annonce la panne (role alert), relance au clic et journalise l’erreur', async () => {
    const reset = vi.fn();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const boom = new Error('boom');
    render(<ServerErrorPage error={boom} reset={reset} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Un problème est survenu' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
    expect(reset).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(boom);
    spy.mockRestore();
  });

  it('ne montre jamais le détail technique de l’erreur', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(<ServerErrorPage error={new Error('secret SQL')} reset={vi.fn()} />);
    expect(screen.queryByText(/secret SQL/)).not.toBeInTheDocument();
  });
});
