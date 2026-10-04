import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContentType, type Content } from '@churchy/shared';
import { ApiError } from '@/lib/api/client';
import { ContentForm } from './ContentForm';

const create = vi.fn();
const update = vi.fn();
vi.mock('@/lib/api/contents.api', () => ({
  contentsApi: {
    create: (...a: unknown[]) => create(...a),
    update: (...a: unknown[]) => update(...a),
  },
}));
const success = vi.fn();
const error = vi.fn();
vi.mock('@/lib/notify', () => ({
  notify: {
    success: (...a: unknown[]) => success(...a),
    error: (...a: unknown[]) => error(...a),
  },
}));

const existing = {
  id: 'c1',
  parishId: 'p1',
  title: 'Je vous salue Marie',
  type: ContentType.PRAYER,
  body: '<p>Pleine de grâce</p>',
  language: 'fr',
  tags: [],
  createdById: 'u1',
} as unknown as Content;

beforeEach(() => {
  for (const m of [create, update, success, error]) m.mockReset();
});

describe('ContentForm — création', () => {
  it('crée le contenu, annonce le succès par un toast et prévient le parent', async () => {
    create.mockResolvedValue({ ...existing, id: 'new' });
    const onSuccess = vi.fn();
    const user = userEvent.setup();
    render(<ContentForm parishId="p1" onSuccess={onSuccess} />);
    await user.type(screen.getByLabelText('Titre'), 'Notre Père');
    await user.type(screen.getByLabelText('Contenu'), 'Notre Père qui es aux cieux');
    await user.click(screen.getByRole('button', { name: 'Ajouter le contenu' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(create).toHaveBeenCalledWith(
      'p1',
      expect.objectContaining({ title: 'Notre Père', body: '<p>Notre Père qui es aux cieux</p>' }),
    );
    expect(success).toHaveBeenCalledWith('Contenu ajouté', expect.stringContaining('Notre Père'));
    expect(update).not.toHaveBeenCalled();
  });

  it('validation Zod côté formulaire : messages sous les champs, rien n’est envoyé', async () => {
    const user = userEvent.setup();
    render(<ContentForm parishId="p1" />);
    await user.type(screen.getByLabelText('Titre'), 'a');
    await user.clear(screen.getByLabelText('Titre'));
    await user.click(screen.getByRole('button', { name: 'Ajouter le contenu' }));

    expect(await screen.findByText('Titre requis')).toBeInTheDocument();
    expect(await screen.findByText('Contenu requis')).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
    expect(success).not.toHaveBeenCalled();
  });

  it('erreur de validation renvoyée par l’API : affichée sous le champ concerné + toast d’erreur', async () => {
    create.mockRejectedValue(
      new ApiError('Titre trop long', 400, { title: ['Titre trop long (serveur)'] }),
    );
    const onSuccess = vi.fn();
    const user = userEvent.setup();
    render(<ContentForm parishId="p1" onSuccess={onSuccess} />);
    await user.type(screen.getByLabelText('Titre'), 'Un titre');
    await user.type(screen.getByLabelText('Contenu'), 'Du texte');
    await user.click(screen.getByRole('button', { name: 'Ajouter le contenu' }));

    expect(await screen.findByText('Titre trop long (serveur)')).toBeInTheDocument();
    expect(error).toHaveBeenCalledWith('Création impossible', expect.any(String));
    expect(onSuccess).not.toHaveBeenCalled();
    expect(success).not.toHaveBeenCalled();
    // la saisie est conservée
    expect(screen.getByLabelText('Titre')).toHaveValue('Un titre');
  });

  it('erreur serveur (500) ou réseau : message général sous le formulaire + toast', async () => {
    create.mockRejectedValue(new ApiError('Internal server error', 500));
    const user = userEvent.setup();
    render(<ContentForm parishId="p1" />);
    await user.type(screen.getByLabelText('Titre'), 'Un titre');
    await user.type(screen.getByLabelText('Contenu'), 'Du texte');
    await user.click(screen.getByRole('button', { name: 'Ajouter le contenu' }));

    expect(await screen.findByText('Internal server error')).toBeInTheDocument();
    expect(error).toHaveBeenCalledWith('Création impossible', 'Internal server error');
    // le bouton redevient utilisable pour réessayer
    expect(screen.getByRole('button', { name: 'Ajouter le contenu' })).toBeEnabled();
  });
});

describe('ContentForm — modification', () => {
  it('préremplit le contenu existant', () => {
    render(<ContentForm parishId="p1" content={existing} />);
    expect(screen.getByLabelText('Titre')).toHaveValue('Je vous salue Marie');
    expect(screen.getByLabelText('Contenu')).toHaveTextContent('Pleine de grâce');
    expect(
      screen.getByRole('button', { name: 'Enregistrer les modifications' }),
    ).toBeInTheDocument();
  });

  it('enregistre via update (jamais create), toast « Contenu modifié »', async () => {
    update.mockResolvedValue({ ...existing, title: 'Ave Maria' });
    const onSuccess = vi.fn();
    const user = userEvent.setup();
    render(<ContentForm parishId="p1" content={existing} onSuccess={onSuccess} />);
    await user.clear(screen.getByLabelText('Titre'));
    await user.type(screen.getByLabelText('Titre'), 'Ave Maria');
    await user.click(screen.getByRole('button', { name: 'Enregistrer les modifications' }));

    await waitFor(() =>
      expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({ title: 'Ave Maria' })),
    );
    expect(update).toHaveBeenCalledWith('c1', expect.objectContaining({ title: 'Ave Maria' }));
    expect(create).not.toHaveBeenCalled();
    expect(success).toHaveBeenCalledWith('Contenu modifié', expect.stringContaining('Ave Maria'));
  });

  it('refus du serveur (403, pas l’auteur) : message + toast « Modification impossible »', async () => {
    update.mockRejectedValue(new ApiError('Seul le créateur peut modifier ce contenu', 403));
    const user = userEvent.setup();
    render(<ContentForm parishId="p1" content={existing} />);
    await user.type(screen.getByLabelText('Titre'), ' bis');
    await user.click(screen.getByRole('button', { name: 'Enregistrer les modifications' }));

    expect(
      await screen.findByText('Seul le créateur peut modifier ce contenu'),
    ).toBeInTheDocument();
    expect(error).toHaveBeenCalledWith(
      'Modification impossible',
      'Seul le créateur peut modifier ce contenu',
    );
    expect(success).not.toHaveBeenCalled();
  });
});
