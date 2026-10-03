import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@/lib/api/client';
import { TemplateForm } from './TemplateForm';

const api = vi.hoisted(() => ({ create: vi.fn(), addStep: vi.fn() }));
vi.mock('@/lib/api/celebrations.api', () => ({ templatesApi: api }));
const success = vi.fn();
const error = vi.fn();
vi.mock('@/lib/notify', () => ({
  notify: {
    success: (...a: unknown[]) => success(...a),
    error: (...a: unknown[]) => error(...a),
  },
}));

beforeEach(() => {
  for (const f of [api.create, api.addStep, success, error]) f.mockReset();
  api.create.mockResolvedValue({ id: 't1' });
  api.addStep.mockResolvedValue({});
});

const setup = () => {
  const onDone = vi.fn();
  const onCancel = vi.fn();
  const user = userEvent.setup();
  render(<TemplateForm parishId="p1" onDone={onDone} onCancel={onCancel} />);
  return { user, onDone, onCancel };
};

describe('TemplateForm', () => {
  it('crée le modèle puis ses étapes dans l’ordre, avec des clés stables', async () => {
    const { user, onDone } = setup();
    await user.type(screen.getByLabelText('Nom du modèle'), 'Messe courte');
    await user.type(screen.getByLabelText('Étape 1'), 'Chant d’entrée');
    await user.click(screen.getByRole('button', { name: 'Ajouter une étape' }));
    await user.type(screen.getByLabelText('Étape 2'), 'Psaume');
    await user.click(screen.getByRole('button', { name: 'Créer le modèle' }));

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(api.create).toHaveBeenCalledWith('p1', { name: 'Messe courte', type: 'SUNDAY_MASS' });
    expect(api.addStep.mock.calls).toEqual([
      ['t1', { title: 'Chant d’entrée', key: 'chant-d-entree', order: 1, isRequired: true }],
      ['t1', { title: 'Psaume', key: 'psaume', order: 2, isRequired: true }],
    ]);
    expect(success).toHaveBeenCalledWith('Modèle créé', '2 étapes');
  });

  it('exige un nom et au moins une étape ; rien n’est envoyé', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Créer le modèle' }));
    expect(await screen.findByText('Nom requis')).toBeInTheDocument();
    expect(screen.getByText('Ajoutez au moins une étape')).toBeInTheDocument();
    expect(api.create).not.toHaveBeenCalled();
  });

  it('ignore les étapes laissées vides', async () => {
    const { user } = setup();
    await user.type(screen.getByLabelText('Nom du modèle'), 'M');
    await user.type(screen.getByLabelText('Étape 1'), 'Psaume');
    await user.click(screen.getByRole('button', { name: 'Ajouter une étape' }));
    await user.click(screen.getByRole('button', { name: 'Créer le modèle' }));
    await waitFor(() => expect(api.addStep).toHaveBeenCalledTimes(1));
  });

  it('pré-remplit avec la messe dominicale', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Pré-remplir : messe dominicale' }));
    expect(screen.getByLabelText('Étape 1')).toHaveValue("Chant d'entrée");
    expect(screen.getByLabelText('Étape 11')).toHaveValue('Envoi');
  });

  it('réordonne et retire des étapes', async () => {
    const { user } = setup();
    await user.type(screen.getByLabelText('Étape 1'), 'A');
    await user.click(screen.getByRole('button', { name: 'Ajouter une étape' }));
    await user.type(screen.getByLabelText('Étape 2'), 'B');
    await user.click(screen.getByRole('button', { name: 'Descendre l’étape 1' }));
    expect(screen.getByLabelText('Étape 1')).toHaveValue('B');
    expect(screen.getByLabelText('Étape 2')).toHaveValue('A');
    await user.click(screen.getByRole('button', { name: 'Retirer l’étape 1' }));
    expect(screen.getByLabelText('Étape 1')).toHaveValue('A');
    expect(screen.queryByLabelText('Étape 2')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retirer l’étape 1' })).toBeDisabled();
  });

  it('titres identiques : clés distinctes', async () => {
    const { user } = setup();
    await user.type(screen.getByLabelText('Nom du modèle'), 'M');
    await user.type(screen.getByLabelText('Étape 1'), 'Chant');
    await user.click(screen.getByRole('button', { name: 'Ajouter une étape' }));
    await user.type(screen.getByLabelText('Étape 2'), 'Chant');
    await user.click(screen.getByRole('button', { name: 'Créer le modèle' }));
    await waitFor(() => expect(api.addStep).toHaveBeenCalledTimes(2));
    expect(api.addStep.mock.calls.map((c) => c[1].key)).toEqual(['chant', 'chant-2']);
  });

  it('erreur de l’API : message dans le formulaire, toast d’erreur, pas de succès', async () => {
    api.create.mockRejectedValue(new ApiError('Erreur interne', 500));
    const { user, onDone } = setup();
    await user.type(screen.getByLabelText('Nom du modèle'), 'M');
    await user.type(screen.getByLabelText('Étape 1'), 'Psaume');
    await user.click(screen.getByRole('button', { name: 'Créer le modèle' }));
    expect(await screen.findByText('Erreur interne')).toBeInTheDocument();
    expect(error).toHaveBeenCalledWith('Erreur lors de la création du modèle', 'Erreur interne');
    expect(success).not.toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Créer le modèle' })).toBeEnabled();
  });
});
