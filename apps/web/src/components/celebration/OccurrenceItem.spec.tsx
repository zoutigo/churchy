import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CelebrationStatus, type OccurrenceView } from '@churchy/shared';
import { OccurrenceItem } from './OccurrenceItem';

const occurrence: OccurrenceView = {
  id: 'o1',
  celebrationId: 'c1',
  startsAt: '2026-10-11T08:00:00.000Z',
  isPast: false,
  status: 'SCHEDULED',
  cancelReason: null,
  description: null,
  internalNote: null,
  sheet: null,
};

const setup = (over: Partial<OccurrenceView> = {}) => {
  const onCancel = vi.fn().mockResolvedValue(undefined);
  const onReinstate = vi.fn().mockResolvedValue(undefined);
  render(
    <ul>
      <OccurrenceItem
        occurrence={{ ...occurrence, ...over }}
        href="/d/o1"
        timezone="Africa/Douala"
        onCancel={onCancel}
        onReinstate={onReinstate}
      />
    </ul>,
  );
  return { onCancel, onReinstate };
};

describe('OccurrenceItem', () => {
  it('affiche la date et l’heure de la paroisse, et propose de préparer la feuille', () => {
    setup();
    expect(screen.getByText('dimanche 11 octobre 2026 à 09:00')).toBeInTheDocument();
    expect(screen.getByText('Pas de feuille')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Préparer la feuille' })).toHaveAttribute(
      'href',
      '/d/o1',
    );
  });

  it('feuille en brouillon : progression ; feuille publiée', () => {
    const sheet = {
      id: 's1',
      status: CelebrationStatus.DRAFT,
      publishedAt: null,
      stepCount: 11,
      filledCount: 3,
    };
    setup({ sheet });
    expect(screen.getByText('Brouillon — 3/11 étapes remplies')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Préparer' })).toBeInTheDocument();
  });

  it('feuille publiée', () => {
    setup({
      sheet: {
        id: 's1',
        status: CelebrationStatus.PUBLISHED,
        publishedAt: '2026-10-05T10:00:00.000Z',
        stepCount: 2,
        filledCount: 2,
      },
    });
    expect(screen.getByText('Feuille publiée')).toBeInTheDocument();
  });

  it('annulation en deux temps, avec motif facultatif', async () => {
    const user = userEvent.setup();
    const { onCancel } = setup();
    await user.click(screen.getByRole('button', { name: 'Annuler cette date' }));
    expect(onCancel).not.toHaveBeenCalled();
    await user.type(screen.getByLabelText('Motif de l’annulation (facultatif)'), 'Pèlerinage');
    await user.click(screen.getByRole('button', { name: 'Confirmer l’annulation' }));
    await waitFor(() => expect(onCancel).toHaveBeenCalledWith('Pèlerinage'));
  });

  it('on peut renoncer à annuler', async () => {
    const user = userEvent.setup();
    const { onCancel } = setup();
    await user.click(screen.getByRole('button', { name: 'Annuler cette date' }));
    await user.click(screen.getByRole('button', { name: 'Retour' }));
    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Annuler cette date' })).toBeInTheDocument();
  });

  it('date annulée : motif affiché, on peut la rétablir', async () => {
    const user = userEvent.setup();
    const { onReinstate } = setup({ status: 'CANCELLED', cancelReason: 'Pèlerinage' });
    expect(screen.getByText('Annulée — Pèlerinage')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Annuler cette date' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Rétablir' }));
    expect(onReinstate).toHaveBeenCalled();
  });

  it('date passée : consultation seule, aucune action possible', () => {
    setup({ isPast: true });
    expect(screen.getByText('Passée')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Consulter' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Annuler cette date' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rétablir' })).not.toBeInTheDocument();
  });

  it('affiche la note interne quand l’API la fournit', () => {
    setup({ internalNote: 'Prévoir la mitre' });
    expect(screen.getByText(/Prévoir la mitre/)).toBeInTheDocument();
  });
});
