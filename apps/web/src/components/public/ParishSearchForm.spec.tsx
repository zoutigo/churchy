import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ParishSearchForm } from './ParishSearchForm';

describe('ParishSearchForm', () => {
  it('est un formulaire GET vers /paroisses (fonctionne sans JavaScript)', () => {
    render(<ParishSearchForm id="s1" />);
    const form = screen.getByRole('search');
    expect(form).toHaveAttribute('action', '/paroisses');
    expect(form).toHaveAttribute('method', 'get');
    expect(screen.getByRole('searchbox')).toHaveAttribute('name', 'q');
  });

  it('a un libellé accessible, le placeholder demandé et le bouton « Rechercher »', () => {
    render(<ParishSearchForm id="s1" />);
    const input = screen.getByLabelText('Rechercher une paroisse, une ville ou un quartier');
    expect(input).toHaveAttribute(
      'placeholder',
      'Rechercher une paroisse, une ville ou un quartier',
    );
    expect(screen.getByRole('button', { name: 'Rechercher' })).toHaveAttribute('type', 'submit');
  });

  it('préremplit la recherche en cours et limite la longueur', () => {
    render(<ParishSearchForm id="s1" defaultValue="lyon" size="compact" />);
    const input = screen.getByRole('searchbox');
    expect(input).toHaveValue('lyon');
    expect(input).toHaveAttribute('maxlength', '100');
  });

  it('deux formulaires sur la même page ont des champs distincts', () => {
    render(
      <>
        <ParishSearchForm id="a" />
        <ParishSearchForm id="b" />
      </>,
    );
    const ids = screen.getAllByRole('searchbox').map((i) => i.id);
    expect(new Set(ids).size).toBe(2);
  });
});
