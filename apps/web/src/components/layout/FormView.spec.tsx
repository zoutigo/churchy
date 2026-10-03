import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormView } from './FormView';
import { PageHeader } from './PageHeader';

describe('FormView', () => {
  it('affiche le titre, le formulaire et un retour explicite', async () => {
    const onBack = vi.fn();
    render(
      <FormView title="Nouveau contenu" description="Chant, lecture" onBack={onBack}>
        <input aria-label="Titre" />
      </FormView>,
    );
    expect(screen.getByRole('heading', { name: 'Nouveau contenu' })).toBeInTheDocument();
    expect(screen.getByText('Chant, lecture')).toBeInTheDocument();
    expect(screen.getByLabelText('Titre')).toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole('button', { name: 'Retour' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('est centré et large (pas aligné à gauche sur desktop)', () => {
    const { container } = render(
      <FormView title="T" onBack={() => undefined}>
        x
      </FormView>,
    );
    expect(container.firstElementChild).toHaveClass('mx-auto', 'w-full', 'max-w-5xl');
  });
});

describe('PageHeader', () => {
  it('affiche titre, description et action', () => {
    render(<PageHeader title="Annonces" description="Infos" action={<button>Ajouter</button>} />);
    expect(screen.getByRole('heading', { name: 'Annonces' })).toBeInTheDocument();
    expect(screen.getByText('Infos')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ajouter' })).toBeInTheDocument();
  });
});
