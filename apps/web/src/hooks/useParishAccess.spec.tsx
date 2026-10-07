import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { ParishPermission } from '@churchy/shared';
import { useParishAccess } from './useParishAccess';

const membership = vi.fn();
vi.mock('@/lib/api/parishes.api', () => ({
  parishesApi: { membership: (...a: unknown[]) => membership(...a) },
}));
let auth: { user: { id: string; role: string } | null };
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => auth }));

const ALL: ParishPermission[] = [
  'parish.view',
  'parish.view.members',
  'parish.internal.read',
  'parish.celebrations.write',
  'parish.announcements.write',
  'parish.manage',
];

async function granted(parishId = 'p1') {
  const { result } = renderHook(() => useParishAccess(parishId));
  await waitFor(() => expect(result.current.ready).toBe(true));
  return ALL.filter((p) => result.current.can(p));
}

describe('useParishAccess', () => {
  beforeEach(() => {
    membership.mockReset();
    auth = { user: { id: 'u1', role: 'USER' } };
  });

  it('n’est pas prêt avant la réponse, et ne donne alors aucun droit', () => {
    membership.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useParishAccess('p1'));
    expect(result.current.ready).toBe(false);
    expect(ALL.filter((p) => result.current.can(p))).toEqual([]);
  });

  it('fidèle : voir la paroisse seulement', async () => {
    membership.mockResolvedValue({ status: 'FAITHFUL', duties: [] });
    expect(await granted()).toEqual(['parish.view']);
  });

  it('paroissien sans responsabilité : voit aussi le contenu des paroissiens', async () => {
    membership.mockResolvedValue({ status: 'PARISHIONER', duties: [] });
    expect(await granted()).toEqual(['parish.view', 'parish.view.members']);
  });

  it('chaque responsabilité ouvre son droit, sans gestion de la paroisse', async () => {
    membership.mockResolvedValue({ status: 'PARISHIONER', duties: ['ANNOUNCER'] });
    expect(await granted()).toContain('parish.announcements.write');
    membership.mockResolvedValue({ status: 'PARISHIONER', duties: ['PREPARER'] });
    const preparer = await granted();
    expect(preparer).toContain('parish.celebrations.write');
    expect(preparer).not.toContain('parish.manage');
  });

  it('administrateur : tout', async () => {
    membership.mockResolvedValue({ status: 'PARISH_ADMIN', duties: [] });
    expect(await granted()).toEqual(ALL);
  });

  it('SUPER_ADMIN sans appartenance : tout', async () => {
    auth = { user: { id: 'u1', role: 'SUPER_ADMIN' } };
    membership.mockResolvedValue({ status: null, duties: [] });
    expect(await granted()).toEqual(ALL);
  });

  it.each(['ADMIN', 'MODERATOR'])(
    '%s de plateforme sans appartenance : lecture seule',
    async (role) => {
      auth = { user: { id: 'u1', role } };
      membership.mockResolvedValue({ status: null, duties: [] });
      expect(await granted()).toEqual([
        'parish.view',
        'parish.view.members',
        'parish.internal.read',
      ]);
    },
  );

  it('ADMIN de plateforme qui est fidèle : ses droits de fidèle, pas ceux du personnel', async () => {
    auth = { user: { id: 'u1', role: 'ADMIN' } };
    membership.mockResolvedValue({ status: 'FAITHFUL', duties: [] });
    expect(await granted()).toEqual(['parish.view']);
  });

  it('simple utilisateur sans appartenance : rien', async () => {
    membership.mockResolvedValue({ status: null, duties: [] });
    expect(await granted()).toEqual([]);
  });

  it('erreur de l’API : prêt, mais aucun droit', async () => {
    membership.mockRejectedValue(new Error('boom'));
    expect(await granted()).toEqual([]);
  });

  it('recharge l’appartenance quand la paroisse change', async () => {
    membership.mockResolvedValueOnce({ status: 'PARISH_ADMIN', duties: [] });
    const { result, rerender } = renderHook(({ id }) => useParishAccess(id), {
      initialProps: { id: 'p1' },
    });
    await waitFor(() => expect(result.current.can('parish.manage')).toBe(true));
    membership.mockResolvedValueOnce({ status: 'FAITHFUL', duties: [] });
    rerender({ id: 'p2' });
    await waitFor(() => expect(result.current.can('parish.manage')).toBe(false));
    expect(membership).toHaveBeenLastCalledWith('p2');
  });
});
