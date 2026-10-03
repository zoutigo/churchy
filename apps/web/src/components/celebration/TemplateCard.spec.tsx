import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CelebrationType } from '@churchy/shared';
import type { TemplateWithSteps } from '@/lib/api/celebrations.api';
import { TemplateCard } from './TemplateCard';

const template = {
  id: 't1',
  name: 'Messe dominicale ordinaire',
  type: CelebrationType.SUNDAY_MASS,
  description: 'Pour les dimanches ordinaires',
  steps: [
    { id: 's1', title: 'Chant d’entrée' },
    { id: 's2', title: 'Gloria' },
  ],
} as unknown as TemplateWithSteps;

const setup = (props: Partial<React.ComponentProps<typeof TemplateCard>> = {}) => {
  const onEdit = vi.fn();
  const onDelete = vi.fn().mockResolvedValue(undefined);
  const user = userEvent.setup();
  render(<TemplateCard template={template} onEdit={onEdit} onDelete={onDelete} {...props} />);
  return { user, onEdit, onDelete };
};

describe('TemplateCard', () => {
  it('replié par défaut : titre et sous-titre visibles, étapes et actions cachées', () => {
    setup();
    expect(screen.getByText('Messe dominicale ordinaire')).toBeInTheDocument();
    expect(screen.getByText(/Messe dominicale — 2 étapes/)).toBeInTheDocument();
    expect(screen.getByRole('button', { expanded: false })).toBeInTheDocument();
    expect(screen.queryByText('Gloria')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Modifier/ })).not.toBeInTheDocument();
  });

  it('le bouton déplie puis replie le contenu du modèle', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { expanded: false }));
    expect(screen.getByRole('button', { expanded: true })).toBeInTheDocument();
    expect(screen.getByText('Chant d’entrée')).toBeInTheDocument();
    expect(screen.getByText('Gloria')).toBeInTheDocument();
    expect(screen.getByText('Pour les dimanches ordinaires')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { expanded: true }));
    expect(screen.queryByText('Gloria')).not.toBeInTheDocument();
  });

  it('« Modifier » appelle onEdit', async () => {
    const { user, onEdit } = setup();
    await user.click(screen.getByRole('button', { expanded: false }));
    await user.click(screen.getByRole('button', { name: 'Modifier Messe dominicale ordinaire' }));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('la suppression se fait en deux temps : rien n’est supprimé avant « Confirmer »', async () => {
    const { user, onDelete } = setup();
    await user.click(screen.getByRole('button', { expanded: false }));
    await user.click(screen.getByRole('button', { name: 'Supprimer Messe dominicale ordinaire' }));
    expect(onDelete).not.toHaveBeenCalled();
    await user.click(
      screen.getByRole('button', {
        name: 'Confirmer la suppression de Messe dominicale ordinaire',
      }),
    );
    await waitFor(() => expect(onDelete).toHaveBeenCalledTimes(1));
  });

  it('un modèle sans étape et une étape unique s’accordent correctement', async () => {
    const { user } = setup({
      template: { ...template, steps: [], description: null } as unknown as TemplateWithSteps,
    });
    expect(screen.getByText(/0 étape$/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { expanded: false }));
    expect(screen.getByText('Aucune étape.')).toBeInTheDocument();
  });
});
