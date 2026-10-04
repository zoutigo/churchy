import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CelebrationType, type CelebrationDetail } from '@churchy/shared';
import { ApiError } from '@/lib/api/client';
import { CelebrationForm } from './CelebrationForm';

const create = vi.fn();
const update = vi.fn();
const findTemplates = vi.fn();
vi.mock('@/lib/api/celebrations.api', () => ({
  celebrationsApi: {
    create: (...a: unknown[]) => create(...a),
    update: (...a: unknown[]) => update(...a),
  },
  templatesApi: { findByParish: (...a: unknown[]) => findTemplates(...a) },
}));
const success = vi.fn();
const error = vi.fn();
vi.mock('@/lib/notify', () => ({
  notify: {
    success: (...a: unknown[]) => success(...a),
    error: (...a: unknown[]) => error(...a),
  },
}));

const detail = (over: Partial<CelebrationDetail> = {}): CelebrationDetail => ({
  id: 'c1',
  parishId: 'p1',
  title: 'Messe du dimanche',
  type: CelebrationType.SUNDAY_MASS,
  location: 'Église',
  description: null,
  internalNote: null,
  announced: false,
  archivedAt: null,
  defaultTemplate: null,
  timezone: 'Europe/Paris',
  lastOccurrenceAt: null,
  endingSoon: false,
  occurrences: [],
  ...over,
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-10-03T12:00:00.000Z') });
  for (const m of [create, update, success, error, findTemplates]) m.mockReset();
  findTemplates.mockResolvedValue([
    { id: 't1', name: 'Messe dominicale', steps: [{}, {}] },
    { id: 't2', name: 'Messe courte', steps: [{}] },
  ]);
});
afterEach(() => vi.useRealTimers());

const renderForm = (props: Partial<React.ComponentProps<typeof CelebrationForm>> = {}) => {
  const onDone = vi.fn();
  const onCancel = vi.fn();
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  render(
    <CelebrationForm
      parishId="p1"
      timezone="Europe/Paris"
      onDone={onDone}
      onCancel={onCancel}
      {...props}
    />,
  );
  return { user, onDone, onCancel };
};

describe('CelebrationForm — création', () => {
  it('n’a plus de champ « ID du modèle » : le modèle est une liste de noms, facultative', async () => {
    renderForm();
    expect(screen.queryByLabelText('ID du modèle')).not.toBeInTheDocument();
    const select = screen.getByLabelText(/Modèle de feuille par défaut/);
    expect(
      await screen.findByRole('option', { name: 'Messe dominicale (2 étapes)' }),
    ).toBeInTheDocument();
    expect(select).toHaveValue('');
    expect(screen.getByRole('option', { name: /Aucun/ })).toBeInTheDocument();
  });

  it('envoie le planning en heure locale, le modèle par défaut, la description et la note', async () => {
    create.mockResolvedValue(detail({ occurrences: [{} as never] }));
    const { user, onDone } = renderForm();
    await screen.findByRole('option', { name: 'Messe courte (1 étapes)' });

    await user.type(screen.getByLabelText('Titre'), 'Messe du dimanche');
    await user.selectOptions(screen.getByLabelText(/Modèle de feuille par défaut/), 't2');
    await user.type(screen.getByLabelText('Note interne (optionnel)'), 'Micro à vérifier');
    await user.type(screen.getByLabelText('Date'), '2026-10-11');
    await user.click(screen.getByLabelText('Publier la série au public'));
    await user.click(screen.getByRole('button', { name: 'Créer la célébration' }));

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(create).toHaveBeenCalledWith(
      'p1',
      expect.objectContaining({
        title: 'Messe du dimanche',
        type: 'SUNDAY_MASS',
        templateId: 't2',
        announced: true,
        internalNote: 'Micro à vérifier',
        schedule: { kind: 'dates', dates: [{ date: '2026-10-11', time: '10:00' }] },
      }),
    );
    expect(success).toHaveBeenCalledWith('Célébration créée', '1 date programmée');
  });

  it('sans modèle choisi, aucun templateId n’est envoyé', async () => {
    create.mockResolvedValue(detail({ occurrences: [{} as never, {} as never] }));
    const { user } = renderForm();
    await user.type(screen.getByLabelText('Titre'), 'Messe');
    await user.type(screen.getByLabelText('Date'), '2026-10-11');
    await user.click(screen.getByRole('button', { name: 'Créer la célébration' }));
    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(create.mock.calls[0][1].templateId).toBeUndefined();
  });

  it('refuse sans date : message sous « Dates », rien n’est envoyé', async () => {
    const { user } = renderForm();
    await user.type(screen.getByLabelText('Titre'), 'Messe');
    await user.click(screen.getByRole('button', { name: 'Créer la célébration' }));
    expect(await screen.findByText('Indiquez au moins une date')).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
  });

  it('refuse une date passée sans appeler l’API', async () => {
    const { user } = renderForm();
    await user.type(screen.getByLabelText('Titre'), 'Messe');
    await user.type(screen.getByLabelText('Date'), '2026-09-01');
    await user.click(screen.getByRole('button', { name: 'Créer la célébration' }));
    expect(
      (await screen.findAllByText('Impossible de programmer une date passée')).length,
    ).toBeGreaterThan(0);
    expect(create).not.toHaveBeenCalled();
  });

  it('exige un titre', async () => {
    const { user } = renderForm();
    await user.type(screen.getByLabelText('Date'), '2026-10-11');
    await user.click(screen.getByRole('button', { name: 'Créer la célébration' }));
    expect(await screen.findByText('Titre requis')).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
  });

  it('erreur de planning renvoyée par l’API : affichée sous « Dates » + toast d’erreur', async () => {
    create.mockRejectedValue(
      new ApiError('Impossible de programmer au-delà d’un an', 400, {
        schedule: ['Impossible de programmer au-delà d’un an'],
      }),
    );
    const { user, onDone } = renderForm();
    await user.type(screen.getByLabelText('Titre'), 'Messe');
    await user.type(screen.getByLabelText('Date'), '2026-10-11');
    await user.click(screen.getByRole('button', { name: 'Créer la célébration' }));

    expect(
      (await screen.findAllByText('Impossible de programmer au-delà d’un an')).length,
    ).toBeGreaterThan(0);
    expect(error).toHaveBeenCalledWith('Erreur lors de la création', expect.any(String));
    expect(success).not.toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
  });

  it('erreur serveur : message général dans le formulaire, toast, le bouton redevient actif', async () => {
    create.mockRejectedValue(new ApiError('Erreur interne', 500));
    const { user } = renderForm();
    await user.type(screen.getByLabelText('Titre'), 'Messe');
    await user.type(screen.getByLabelText('Date'), '2026-10-11');
    await user.click(screen.getByRole('button', { name: 'Créer la célébration' }));

    expect(await screen.findByText('Erreur interne')).toBeInTheDocument();
    expect(error).toHaveBeenCalledWith('Erreur lors de la création', 'Erreur interne');
    expect(screen.getByRole('button', { name: 'Créer la célébration' })).toBeEnabled();
  });

  it('Annuler prévient le parent', async () => {
    const { user, onCancel } = renderForm();
    // L'éditeur de texte a aussi un bouton « Annuler » (défaire) : celui du formulaire est le dernier.
    await user.click(screen.getAllByRole('button', { name: 'Annuler' }).at(-1)!);
    expect(onCancel).toHaveBeenCalled();
  });
});

describe('CelebrationForm — modification', () => {
  it('préremplit, masque le planning (les dates se gèrent à part) et enregistre', async () => {
    update.mockResolvedValue(detail({ title: 'Renommée' }));
    const { user, onDone } = renderForm({
      celebration: detail({ defaultTemplate: { id: 't1', name: 'Messe dominicale' } }),
    });
    expect(screen.getByLabelText('Titre')).toHaveValue('Messe du dimanche');
    expect(screen.queryByTestId('schedule-fields')).not.toBeInTheDocument();
    await screen.findByRole('option', { name: 'Messe dominicale (2 étapes)' });
    expect(screen.getByLabelText(/Modèle de feuille par défaut/)).toHaveValue('t1');

    await user.clear(screen.getByLabelText('Titre'));
    await user.type(screen.getByLabelText('Titre'), 'Renommée');
    await user.selectOptions(screen.getByLabelText(/Modèle de feuille par défaut/), '');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(update).toHaveBeenCalledWith(
      'c1',
      expect.objectContaining({ title: 'Renommée', defaultTemplateId: null, announced: false }),
    );
    expect(create).not.toHaveBeenCalled();
    expect(success).toHaveBeenCalledWith('Célébration modifiée');
  });

  it('série entièrement passée : l’API refuse (409), l’erreur est affichée', async () => {
    update.mockRejectedValue(
      new ApiError('Cette date est passée : elle ne peut plus être modifiée', 409),
    );
    const { user, onDone } = renderForm({ celebration: detail() });
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(
      await screen.findByText('Cette date est passée : elle ne peut plus être modifiée'),
    ).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalled();
  });
});
