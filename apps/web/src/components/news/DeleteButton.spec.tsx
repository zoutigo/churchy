import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeleteButton } from './DeleteButton';

describe('DeleteButton', () => {
  it('demande une confirmation avant de supprimer', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<DeleteButton label="Horaires" onConfirm={onConfirm} />);

    await user.click(screen.getByRole('button', { name: 'Supprimer Horaires' }));
    expect(onConfirm).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Confirmer la suppression de Horaires' }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole('button', { name: 'Supprimer Horaires' })).toBeInTheDocument();
  });

  it('« Annuler » revient à l’état initial sans supprimer', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(<DeleteButton label="Horaires" onConfirm={onConfirm} />);
    await user.click(screen.getByRole('button', { name: 'Supprimer Horaires' }));
    await user.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(screen.getByRole('button', { name: 'Supprimer Horaires' })).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
