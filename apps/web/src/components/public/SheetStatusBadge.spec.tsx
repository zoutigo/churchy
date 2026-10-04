import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SheetStatusBadge } from './SheetStatusBadge';

describe('SheetStatusBadge', () => {
  it('affiche « Feuille disponible » quand la feuille est publiée', () => {
    render(<SheetStatusBadge status="AVAILABLE" />);
    expect(screen.getByText('Feuille disponible')).toBeInTheDocument();
  });

  it('n’affiche rien quand la feuille est en préparation', () => {
    const { container } = render(<SheetStatusBadge status="IN_PREPARATION" />);
    expect(container).toBeEmptyDOMElement();
  });
});
