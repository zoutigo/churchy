import { ConflictException, NotFoundException } from '@nestjs/common';
import { MAX_FAVORITE_PARISHES } from '@churchy/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { PublicService } from '../public/public.service';
import { FavoritesService } from './favorites.service';

type Fn = jest.Mock;

describe('FavoritesService', () => {
  let prisma: {
    parish: { findUnique: Fn; findMany: Fn };
    favoriteParish: { findMany: Fn; createMany: Fn; deleteMany: Fn };
  };
  let publicService: { listParishSummaries: Fn };
  let service: FavoritesService;
  const rows = (...ids: string[]) => ids.map((parishId) => ({ parishId }));

  beforeEach(() => {
    prisma = {
      parish: { findUnique: jest.fn(), findMany: jest.fn() },
      favoriteParish: { findMany: jest.fn(), createMany: jest.fn(), deleteMany: jest.fn() },
    };
    publicService = { listParishSummaries: jest.fn().mockResolvedValue([]) };
    service = new FavoritesService(
      prisma as unknown as PrismaService,
      publicService as unknown as PublicService,
    );
  });

  it('list : renvoie les résumés dans l’ordre d’ajout', async () => {
    prisma.favoriteParish.findMany.mockResolvedValue(rows('p2', 'p1'));
    await service.list('u1');
    expect(prisma.favoriteParish.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'u1' } }),
    );
    expect(publicService.listParishSummaries).toHaveBeenCalledWith(['p2', 'p1']);
  });

  describe('add', () => {
    it('refuse une paroisse inconnue', async () => {
      prisma.parish.findUnique.mockResolvedValue(null);
      await expect(service.add('u1', 'nope')).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.favoriteParish.createMany).not.toHaveBeenCalled();
    });

    it('enregistre le favori', async () => {
      prisma.parish.findUnique.mockResolvedValue({ id: 'p1' });
      prisma.favoriteParish.findMany.mockResolvedValue([]);
      await service.add('u1', 'p1');
      expect(prisma.favoriteParish.createMany).toHaveBeenCalledWith({
        data: [{ userId: 'u1', parishId: 'p1' }],
        skipDuplicates: true,
      });
    });

    it('est idempotent, même quand la limite est atteinte', async () => {
      prisma.parish.findUnique.mockResolvedValue({ id: 'p1' });
      prisma.favoriteParish.findMany.mockResolvedValue(
        rows('p1', ...Array.from({ length: MAX_FAVORITE_PARISHES - 1 }, (_, i) => `x${i}`)),
      );
      await service.add('u1', 'p1');
      expect(prisma.favoriteParish.createMany).not.toHaveBeenCalled();
    });

    it(`refuse un favori de plus que ${MAX_FAVORITE_PARISHES} (409)`, async () => {
      prisma.parish.findUnique.mockResolvedValue({ id: 'new' });
      prisma.favoriteParish.findMany.mockResolvedValue(
        rows(...Array.from({ length: MAX_FAVORITE_PARISHES }, (_, i) => `x${i}`)),
      );
      await expect(service.add('u1', 'new')).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.favoriteParish.createMany).not.toHaveBeenCalled();
    });
  });

  it('remove : ne supprime que le favori de cet utilisateur', async () => {
    await service.remove('u1', 'p1');
    expect(prisma.favoriteParish.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'u1', parishId: 'p1' },
    });
  });

  describe('merge', () => {
    it('ajoute les nouvelles paroisses connues, ignore les doublons et les inconnues', async () => {
      prisma.favoriteParish.findMany.mockResolvedValue(rows('a'));
      prisma.parish.findMany.mockResolvedValue([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
      await service.merge('u1', ['a', 'b', 'ghost', 'c']);
      const data = prisma.favoriteParish.createMany.mock.calls[0][0].data;
      expect(data.map((d: { parishId: string }) => d.parishId)).toEqual(['b', 'c']);
      // ordre conservé : horodatages strictement croissants
      expect(data[1].createdAt.getTime()).toBeGreaterThan(data[0].createdAt.getTime());
    });

    it('respecte la limite : le surplus est écarté', async () => {
      const have = Array.from({ length: MAX_FAVORITE_PARISHES - 2 }, (_, i) => `x${i}`);
      prisma.favoriteParish.findMany.mockResolvedValue(rows(...have));
      prisma.parish.findMany.mockResolvedValue([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
      await service.merge('u1', ['a', 'b', 'c']);
      const data = prisma.favoriteParish.createMany.mock.calls[0][0].data;
      expect(data.map((d: { parishId: string }) => d.parishId)).toEqual(['a', 'b']);
    });

    it('n’écrit rien quand il n’y a rien à ajouter', async () => {
      prisma.favoriteParish.findMany.mockResolvedValue(rows('a'));
      prisma.parish.findMany.mockResolvedValue([{ id: 'a' }]);
      await service.merge('u1', ['a']);
      expect(prisma.favoriteParish.createMany).not.toHaveBeenCalled();
    });
  });
});
