import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { buildSearchWhere, PublicService, toCelebrationSummary } from './public.service';

type Fn = jest.Mock;

const row = (over: Record<string, unknown> = {}) => ({
  id: 'c1',
  parishId: 'p1',
  title: 'Messe dominicale',
  date: new Date('2026-10-04T08:30:00.000Z'),
  location: 'Église Saint-Pierre',
  status: 'PUBLISHED',
  template: { type: 'SUNDAY_MASS' },
  ...over,
});

describe('toCelebrationSummary', () => {
  it('publiée → feuille disponible', () => {
    expect(toCelebrationSummary(row())).toEqual({
      id: 'c1',
      title: 'Messe dominicale',
      date: '2026-10-04T08:30:00.000Z',
      location: 'Église Saint-Pierre',
      type: 'SUNDAY_MASS',
      sheetStatus: 'AVAILABLE',
    });
  });

  it('brouillon annoncé → feuille en préparation', () => {
    expect(toCelebrationSummary(row({ status: 'DRAFT' })).sheetStatus).toBe('IN_PREPARATION');
  });
});

describe('buildSearchWhere', () => {
  it('ne filtre pas sans terme de recherche', () => {
    expect(buildSearchWhere(undefined)).toEqual({});
    expect(buildSearchWhere('   ')).toEqual({});
  });

  it('exige chaque mot dans au moins un champ (nom, ville, quartier, église, adresse)', () => {
    const where = buildSearchWhere('saint lyon') as { AND: { OR: object[] }[] };
    expect(where.AND).toHaveLength(2);
    expect(where.AND[0].OR).toHaveLength(5);
    expect(where.AND[0].OR[0]).toEqual({ name: { contains: 'saint', mode: 'insensitive' } });
    expect(where.AND[1].OR[1]).toEqual({ city: { contains: 'lyon', mode: 'insensitive' } });
  });

  it('plafonne le nombre de mots pris en compte', () => {
    const where = buildSearchWhere('a b c d e f g h') as { AND: unknown[] };
    expect(where.AND).toHaveLength(5);
  });
});

describe('PublicService', () => {
  let prisma: {
    parish: { count: Fn; findMany: Fn; findUnique: Fn };
    celebration: { findMany: Fn; findFirst: Fn };
    announcement: { findMany: Fn };
    activity: { findMany: Fn };
  };
  let service: PublicService;

  beforeEach(() => {
    prisma = {
      parish: { count: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() },
      celebration: { findMany: jest.fn(), findFirst: jest.fn() },
      announcement: { findMany: jest.fn() },
      activity: { findMany: jest.fn() },
    };
    service = new PublicService(prisma as unknown as PrismaService);
  });

  describe('searchParishes', () => {
    const parish = (id: string, name: string) => ({
      id,
      name,
      city: 'Lyon',
      country: 'France',
      district: null,
      mainChurch: null,
    });

    it('pagine et joint la prochaine célébration en UNE requête', async () => {
      prisma.parish.count.mockResolvedValue(30);
      prisma.parish.findMany.mockResolvedValue([parish('p1', 'A'), parish('p2', 'B')]);
      prisma.celebration.findMany.mockResolvedValue([row({ parishId: 'p2' })]);

      const res = await service.searchParishes({ q: 'lyon', page: 3, limit: 12 });

      expect(prisma.parish.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 24, take: 12 }),
      );
      expect(prisma.celebration.findMany).toHaveBeenCalledTimes(1);
      expect(res.total).toBe(30);
      expect(res.page).toBe(3);
      expect(res.items[0].nextCelebration).toBeNull();
      expect(res.items[1].nextCelebration).toMatchObject({ id: 'c1', sheetStatus: 'AVAILABLE' });
    });

    it('ne cherche que des célébrations visibles et à venir', async () => {
      prisma.parish.count.mockResolvedValue(1);
      prisma.parish.findMany.mockResolvedValue([parish('p1', 'A')]);
      prisma.celebration.findMany.mockResolvedValue([]);

      await service.searchParishes({ page: 1, limit: 12 });

      const { where } = prisma.celebration.findMany.mock.calls[0][0];
      expect(where.OR).toEqual([{ status: 'PUBLISHED' }, { status: 'DRAFT', announced: true }]);
      expect(where.date.gte.getTime()).toBeLessThan(Date.now());
      expect(where.date.gte.getTime()).toBeGreaterThan(Date.now() - 4 * 3600 * 1000);
    });

    it('n’interroge pas les célébrations quand il n’y a aucun résultat', async () => {
      prisma.parish.count.mockResolvedValue(0);
      prisma.parish.findMany.mockResolvedValue([]);
      const res = await service.searchParishes({ q: 'zzz', page: 1, limit: 12 });
      expect(res).toEqual({ items: [], total: 0, page: 1, limit: 12 });
      expect(prisma.celebration.findMany).not.toHaveBeenCalled();
    });
  });

  describe('getParish', () => {
    it('sélectionne uniquement les champs publics', async () => {
      prisma.parish.findUnique.mockResolvedValue({ id: 'p1', name: 'A' });
      await service.getParish('p1');
      const { select } = prisma.parish.findUnique.mock.calls[0][0];
      expect(Object.keys(select).sort()).toEqual(
        [
          'address',
          'city',
          'country',
          'description',
          'district',
          'email',
          'id',
          'imageUrl',
          'mainChurch',
          'name',
          'phone',
          'website',
        ].sort(),
      );
      expect(select).not.toHaveProperty('slug');
      expect(select).not.toHaveProperty('members');
    });

    it('404 si la paroisse n’existe pas', async () => {
      prisma.parish.findUnique.mockResolvedValue(null);
      await expect(service.getParish('x')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('getCelebration', () => {
    const full = (status: string) =>
      row({
        status,
        parish: { id: 'p1', name: 'Saint Pierre', city: 'Lyon' },
        steps: [
          {
            id: 's1',
            title: 'Première lecture',
            order: 1,
            customText: null,
            content: { title: 'Isaïe', body: 'Texte', tags: ['x'], createdById: 'u1' },
          },
        ],
      });

    it('expose le déroulement (titre/texte seulement) d’une feuille publiée', async () => {
      prisma.celebration.findFirst.mockResolvedValue(full('PUBLISHED'));
      const res = await service.getCelebration('c1');
      expect(res.sheetStatus).toBe('AVAILABLE');
      expect(res.steps).toEqual([
        {
          id: 's1',
          title: 'Première lecture',
          order: 1,
          customText: null,
          content: { title: 'Isaïe', body: 'Texte' },
        },
      ]);
    });

    it('masque le déroulement d’une célébration seulement annoncée', async () => {
      prisma.celebration.findFirst.mockResolvedValue(full('DRAFT'));
      const res = await service.getCelebration('c1');
      expect(res.sheetStatus).toBe('IN_PREPARATION');
      expect(res.steps).toEqual([]);
    });

    it('404 pour une célébration non visible (brouillon non annoncé, archivée, inconnue)', async () => {
      prisma.celebration.findFirst.mockResolvedValue(null);
      await expect(service.getCelebration('c1')).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.celebration.findFirst.mock.calls[0][0].where.OR).toEqual([
        { status: 'PUBLISHED' },
        { status: 'DRAFT', announced: true },
      ]);
    });
  });

  describe('listes d’une paroisse', () => {
    it('404 si la paroisse n’existe pas (pas de liste vide trompeuse)', async () => {
      prisma.parish.findUnique.mockResolvedValue(null);
      await expect(service.listCelebrations('x')).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.listAnnouncements('x')).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.listActivities('x')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('les célébrations sont triées par date croissante', async () => {
      prisma.parish.findUnique.mockResolvedValue({ id: 'p1' });
      prisma.celebration.findMany.mockResolvedValue([row()]);
      const res = await service.listCelebrations('p1');
      expect(prisma.celebration.findMany.mock.calls[0][0].orderBy).toEqual({ date: 'asc' });
      expect(res).toHaveLength(1);
    });

    it('les activités passées sont exclues, les annonces sont les plus récentes d’abord', async () => {
      prisma.parish.findUnique.mockResolvedValue({ id: 'p1' });
      prisma.activity.findMany.mockResolvedValue([]);
      prisma.announcement.findMany.mockResolvedValue([
        {
          id: 'a1',
          parishId: 'p1',
          title: 'Horaires',
          summary: null,
          body: 'Nouveaux horaires',
          imageUrl: null,
          createdById: 'u1',
          publishedAt: new Date('2026-09-30T10:00:00.000Z'),
        },
      ]);

      await service.listActivities('p1');
      expect(prisma.activity.findMany.mock.calls[0][0].where.startsAt.gte).toBeInstanceOf(Date);
      expect(prisma.activity.findMany.mock.calls[0][0].orderBy).toEqual({ startsAt: 'asc' });

      const announcements = await service.listAnnouncements('p1');
      expect(prisma.announcement.findMany.mock.calls[0][0].orderBy).toEqual({
        publishedAt: 'desc',
      });
      // Pas de fuite de champs internes (createdById, parishId).
      expect(announcements[0]).toEqual({
        id: 'a1',
        title: 'Horaires',
        summary: null,
        body: 'Nouveaux horaires',
        imageUrl: null,
        publishedAt: '2026-09-30T10:00:00.000Z',
      });
    });
  });
});
