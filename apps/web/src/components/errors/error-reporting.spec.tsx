import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const handlePageError = vi.hoisted(() => vi.fn());
vi.mock('@/lib/client-errors', () => ({ handlePageError }));

import GlobalError from '@/app/global-error';
import { ServerErrorPage } from './ServerErrorPage';

describe('pages d’erreur : signalement et rechargement automatique', () => {
  beforeEach(() => {
    handlePageError.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('la page d’erreur d’une zone transmet l’erreur (source segment)', () => {
    const boom = new Error('boom');
    render(<ServerErrorPage error={boom} reset={vi.fn()} />);
    expect(handlePageError).toHaveBeenCalledWith(boom, 'segment');
  });

  it('la page d’erreur globale transmet l’erreur (source global) et reste bilingue', () => {
    const boom = new Error('layout cassé');
    render(<GlobalError error={boom} reset={vi.fn()} />);
    expect(handlePageError).toHaveBeenCalledWith(boom, 'global');
    expect(screen.getByRole('button', { name: 'Réessayer / Try again' })).toBeInTheDocument();
  });
});
