import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContentType, type Content } from '@churchy/shared';
import { ApiError } from '@/lib/api/client';
import ContentsPage from './page';
import ContentDetailPage from './[contentId]/page';

const findByParish = vi.fn();
const findById = vi.fn();
const remove = vi.fn();
vi.mock('@/lib/api/contents.api', () => ({
  contentsApi: {
    findByParish: (...a: unknown[]) => findByParish(...a),
    findById: (...a: unknown[]) => findById(...a),
    delete: (...a: unknown[]) => remove(...a),
    create: vi.fn(),
    update: vi.fn(),
  },
}));
const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
let currentUser: { id: string } | null = { id: 'u1' };
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: currentUser }) }));
const success = vi.fn();
const error = vi.fn();
vi.mock('@/lib/notify', () => ({
  notify: {
    success: (...a: unknown[]) => success(...a),
    error: (...a: unknown[]) => error(...a),
  },
}));

const make = (i: number, type = ContentType.SONG, extra: Partial<Content> = {}) =>
  ({
    id: `c${i}`,
    parishId: 'p1',
    title: `Contenu ${i}`,
    type,
    body: `<p>Texte ${i}</p>`,
    language: 'fr',
    tags: [],
    createdById: 'u1',
    createdAt: '2026-10-01T10:00:00.000Z',
    createdBy: { id: 'u1', firstName: 'Valery', lastName: 'Mbele' },
    ...extra,
  }) as unknown as Content;

beforeEach(() => {
  for (const m of [findByParish, findById, remove, push, success, error]) m.mockReset();
  currentUser = { id: 'u1' };
});

describe('liste de la bibliothèque', () => {
  it('chaque contenu est un lien vers sa page de lecture', async () => {
    findByParish.mockResolvedValue([make(1)]);
    render(<ContentsPage params={{ parishId: 'p1' }} />);
    const link = await screen.findByRole('link', { name: /Contenu 1/ });
    expect(link).toHaveAttribute('href', '/dashboard/parishes/p1/contents/c1');
    expect(within(link).getByText('Chant')).toBeInTheDocument();
  });

  it('affiche l’erreur de chargement renvoyée par l’API', async () => {
    findByParish.mockRejectedValue(new ApiError('Accès refusé', 403));
    render(<ContentsPage params={{ parishId: 'p1' }} />);
    expect(await screen.findByText('Accès refusé')).toBeInTheDocument();
  });

  it('état vide', async () => {
    findByParish.mockResolvedValue([]);
    render(<ContentsPage params={{ parishId: 'p1' }} />);
    expect(await screen.findByText("Aucun contenu pour l'instant.")).toBeInTheDocument();
  });

  it('recherche et filtre par type, avec compteur et état « aucun résultat »', async () => {
    findByParish.mockResolvedValue([
      make(1, ContentType.SONG, { title: 'Ave Maria' }),
      make(2, ContentType.PRAYER, { title: 'Je vous salue Marie' }),
      make(3, ContentType.PRAYER, { title: 'Notre Père' }),
    ]);
    const user = userEvent.setup();
    render(<ContentsPage params={{ parishId: 'p1' }} />);
    await screen.findByText('Ave Maria');
    expect(screen.getByRole('status')).toHaveTextContent('3 contenus');

    await user.selectOptions(screen.getByLabelText('Filtrer par type'), ContentType.PRAYER);
    expect(screen.queryByText('Ave Maria')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('2 contenus sur 3');

    await user.type(screen.getByLabelText('Rechercher un contenu'), 'pere');
    expect(screen.getByText('Notre Père')).toBeInTheDocument();
    expect(screen.queryByText('Je vous salue Marie')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('1 contenu sur 3');

    await user.clear(screen.getByLabelText('Rechercher un contenu'));
    await user.type(screen.getByLabelText('Rechercher un contenu'), 'zzz');
    expect(screen.getByText('Aucun contenu ne correspond à votre recherche.')).toBeInTheDocument();
  });

  it('pagine par 24 avec « Afficher plus »', async () => {
    findByParish.mockResolvedValue(Array.from({ length: 30 }, (_, i) => make(i + 1)));
    const user = userEvent.setup();
    render(<ContentsPage params={{ parishId: 'p1' }} />);
    await screen.findByText('Contenu 1');
    expect(screen.getAllByRole('link', { name: /Contenu/ })).toHaveLength(24);
    await user.click(screen.getByRole('button', { name: /Afficher plus \(6 restants\)/ }));
    expect(screen.getAllByRole('link', { name: /Contenu/ })).toHaveLength(30);
    expect(screen.queryByRole('button', { name: /Afficher plus/ })).not.toBeInTheDocument();
  });
});

describe('page d’un contenu', () => {
  const params = { parishId: 'p1', contentId: 'c1' };

  it('affiche le texte, le type, la date et l’auteur', async () => {
    findById.mockResolvedValue(make(1, ContentType.PRAYER, { title: 'Je vous salue Marie' }));
    render(<ContentDetailPage params={params} />);
    expect(await screen.findByRole('heading', { name: 'Je vous salue Marie' })).toBeInTheDocument();
    expect(screen.getByText('Prière')).toBeInTheDocument();
    expect(screen.getByText('Texte 1')).toBeInTheDocument();
    expect(screen.getByText(/par Valery Mbele/)).toBeInTheDocument();
  });

  it('l’auteur peut modifier : le formulaire est prérempli et l’enregistrement met la page à jour', async () => {
    findById.mockResolvedValue(make(1));
    const { contentsApi } = await import('@/lib/api/contents.api');
    vi.mocked(contentsApi.update).mockResolvedValue(
      make(1, ContentType.SONG, { title: 'Nouveau titre' }),
    );
    const user = userEvent.setup();
    render(<ContentDetailPage params={params} />);
    await user.click(await screen.findByRole('button', { name: 'Modifier' }));
    expect(screen.getByLabelText('Titre')).toHaveValue('Contenu 1');
    await user.clear(screen.getByLabelText('Titre'));
    await user.type(screen.getByLabelText('Titre'), 'Nouveau titre');
    await user.click(screen.getByRole('button', { name: 'Enregistrer les modifications' }));
    expect(await screen.findByRole('heading', { name: 'Nouveau titre' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Titre')).not.toBeInTheDocument();
  });

  it('« Retour » depuis la modification revient à la lecture sans rien enregistrer', async () => {
    findById.mockResolvedValue(make(1));
    const user = userEvent.setup();
    render(<ContentDetailPage params={params} />);
    await user.click(await screen.findByRole('button', { name: 'Modifier' }));
    await user.click(screen.getByRole('button', { name: /Retour/ }));
    expect(screen.getByRole('heading', { name: 'Contenu 1' })).toBeInTheDocument();
  });

  it('supprime en deux temps, annonce le succès par un toast puis retourne à la liste', async () => {
    findById.mockResolvedValue(make(1));
    remove.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<ContentDetailPage params={params} />);
    await user.click(await screen.findByRole('button', { name: 'Supprimer Contenu 1' }));
    expect(remove).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Confirmer la suppression de Contenu 1' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/dashboard/parishes/p1/contents'));
    expect(remove).toHaveBeenCalledWith('c1');
    expect(success).toHaveBeenCalledWith('Contenu supprimé', expect.stringContaining('Contenu 1'));
  });

  it('échec de suppression : toast d’erreur, on reste sur la page', async () => {
    findById.mockResolvedValue(make(1));
    remove.mockRejectedValue(new ApiError('Seul le créateur peut supprimer ce contenu', 403));
    const user = userEvent.setup();
    render(<ContentDetailPage params={params} />);
    await user.click(await screen.findByRole('button', { name: 'Supprimer Contenu 1' }));
    await user.click(screen.getByRole('button', { name: 'Confirmer la suppression de Contenu 1' }));
    await waitFor(() =>
      expect(error).toHaveBeenCalledWith(
        'Suppression impossible',
        'Seul le créateur peut supprimer ce contenu',
      ),
    );
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Contenu 1' })).toBeInTheDocument();
  });

  it('un autre membre lit seulement : ni Modifier ni Supprimer, avec une explication', async () => {
    currentUser = { id: 'autre' };
    findById.mockResolvedValue(make(1));
    render(<ContentDetailPage params={params} />);
    await screen.findByRole('heading', { name: 'Contenu 1' });
    expect(screen.queryByRole('button', { name: 'Modifier' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Supprimer/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Seul l’auteur/)).toBeInTheDocument();
  });

  it('contenu introuvable / autre paroisse : message d’erreur et lien de retour', async () => {
    findById.mockRejectedValue(new ApiError('Contenu introuvable', 404));
    render(<ContentDetailPage params={params} />);
    expect(await screen.findByText('Contenu introuvable')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Retour à la bibliothèque' })).toHaveAttribute(
      'href',
      '/dashboard/parishes/p1/contents',
    );
  });
});
