import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { buildSearchWhere, PublicService, toCelebrationSummary } from './public.service';

type Fn = jest.Mock;

const row = (over: Record<string, unknown> = {}) => ({
  id: 'o1',
  celebrationId: 'c1',
  parishId: 'p1',
  startsAt: new Date('2026-10-04T08:30:00.000Z'),
  status: 'SCHEDULED',
  cancelReason: null,
  celebration: { title: 'Messe dominicale', type: 'SUNDAY_MASS', location: 'Église Saint-Pierre' },
  sheet: { status: 'PUBLISHED' },
  ...over,
});

describe('toCelebrationSummary', () => {
  it('feuille publiée → feuille disponible, avec le fuseau de la paroisse', () => {
    expect(toCelebrationSummary(row(), 'Africa/Douala')).toEqual({
      id: 'o1',
      celebrationId: 'c1',
      title: 'Messe dominicale',
      date: '2026-10-04T08:30:00.000Z',
      location: 'Église Saint-Pierre',
      type: 'SUNDAY_MASS',
      sheetStatus: 'AVAILABLE',
      cancelled: false,
      cancelReason: null,
      timezone: 'Africa/Douala',
    });
  });

  it('feuille en brouillon ou pas encore créée → feuille en préparation', () => {
    expect(toCelebrationSummary(row({ sheet: { status: 'DRAFT' } }), 'UTC').sheetStatus).toBe(
      'IN_PREPARATION',
    );
    expect(toCelebrationSummary(row({ sheet: null }), 'UTC').sheetStatus).toBe('IN_PREPARATION');
  });

  it('une date annulée reste affichée, avec son motif', () => {
    const res = toCelebrationSummary(
      row({ status: 'CANCELLED', cancelReason: 'Pèlerinage diocésain' }),
      'UTC',
    );
    expect(res.cancelled).toBe(true);
    expect(res.cancelReason).toBe('Pèlerinage diocésain');
  });

  it('ne révèle pas un motif d’annulation résiduel sur une date maintenue', () => {
    expect(
      toCelebrationSummary(row({ cancelReason: 'ancien motif' }), 'UTC').cancelReason,
    ).toBeNull();
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
    celebrationOccurrence: { findMany: Fn; findFirst: Fn };
    announcement: { findMany: Fn };
    activity: { findMany: Fn };
  };
  let service: PublicService;

  beforeEach(() => {
    prisma = {
      parish: { count: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() },
      celebrationOccurrence: { findMany: jest.fn(), findFirst: jest.fn() },
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
      timezone: 'Europe/Paris',
    });

    it('pagine et joint la prochaine célébration en UNE requête', async () => {
      prisma.parish.count.mockResolvedValue(30);
      prisma.parish.findMany.mockResolvedValue([parish('p1', 'A'), parish('p2', 'B')]);
      prisma.celebrationOccurrence.findMany.mockResolvedValue([row({ parishId: 'p2' })]);

      const res = await service.searchParishes({ q: 'lyon', page: 3, limit: 12 });

      expect(prisma.parish.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 24, take: 12 }),
      );
      expect(prisma.celebrationOccurrence.findMany).toHaveBeenCalledTimes(1);
      expect(res.total).toBe(30);
      expect(res.page).toBe(3);
      expect(res.items[0].nextCelebration).toBeNull();
      expect(res.items[1].nextCelebration).toMatchObject({
        id: 'o1',
        sheetStatus: 'AVAILABLE',
        timezone: 'Europe/Paris',
      });
      // Le fuseau sert à formater la date, il n'apparaît pas dans le résumé de la paroisse.
      expect(res.items[0]).not.toHaveProperty('timezone');
    });

    it('ne cherche que des dates à venir, maintenues, de séries annoncées et non archivées', async () => {
      prisma.parish.count.mockResolvedValue(1);
      prisma.parish.findMany.mockResolvedValue([parish('p1', 'A')]);
      prisma.celebrationOccurrence.findMany.mockResolvedValue([]);

      await service.searchParishes({ page: 1, limit: 12 });

      const { where } = prisma.celebrationOccurrence.findMany.mock.calls[0][0];
      expect(where.celebration).toEqual({ announced: true, archivedAt: null });
      expect(where.status).toBe('SCHEDULED');
      expect(where.startsAt.gte.getTime()).toBeLessThan(Date.now());
      expect(where.startsAt.gte.getTime()).toBeGreaterThan(Date.now() - 4 * 3600 * 1000);
    });

    it('n’interroge pas les célébrations quand il n’y a aucun résultat', async () => {
      prisma.parish.count.mockResolvedValue(0);
      prisma.parish.findMany.mockResolvedValue([]);
      const res = await service.searchParishes({ q: 'zzz', page: 1, limit: 12 });
      expect(res).toEqual({ items: [], total: 0, page: 1, limit: 12 });
      expect(prisma.celebrationOccurrence.findMany).not.toHaveBeenCalled();
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
          'addressComplement',
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
          'region',
          'timezone',
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
    const full = (over: Record<string, unknown> = {}) =>
      row({
        celebration: {
          title: 'Messe dominicale',
          type: 'SUNDAY_MASS',
          location: 'Église Saint-Pierre',
          description: '<p>Messe de rentrée</p>',
        },
        description: '<p>L’évêque sera des nôtres</p>',
        parish: { id: 'p1', name: 'Saint Pierre', city: 'Lyon', timezone: 'Europe/Paris' },
        sheet: {
          status: 'PUBLISHED',
          steps: [
            {
              id: 's1',
              title: 'Première lecture',
              order: 1,
              customText: null,
              content: { title: 'Isaïe', body: 'Texte', tags: ['x'], createdById: 'u1' },
            },
          ],
        },
        ...over,
      });

    it('expose le déroulement (titre/texte seulement) d’une feuille publiée', async () => {
      prisma.celebrationOccurrence.findFirst.mockResolvedValue(full());
      const res = await service.getCelebration('o1');
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

    it('donne la description de la série et la précision propre à la date', async () => {
      prisma.celebrationOccurrence.findFirst.mockResolvedValue(full());
      const res = await service.getCelebration('o1');
      expect(res.description).toBe('<p>Messe de rentrée</p>');
      expect(res.occurrenceDescription).toBe('<p>L’évêque sera des nôtres</p>');
    });

    it('ne divulgue jamais les notes internes', async () => {
      prisma.celebrationOccurrence.findFirst.mockResolvedValue(
        full({
          internalNote: 'Micro HS',
          celebration: {
            title: 'M',
            type: 'OTHER',
            location: null,
            description: null,
            internalNote: 'Peintre : attention',
          },
        }),
      );
      const res = await service.getCelebration('o1');
      expect(JSON.stringify(res)).not.toContain('Micro HS');
      expect(JSON.stringify(res)).not.toContain('Peintre');
      // Et la requête ne les demande même pas à la base.
      const { include } = prisma.celebrationOccurrence.findFirst.mock.calls[0][0];
      expect(include.celebration.select).not.toHaveProperty('internalNote');
    });

    it('masque le déroulement d’une date dont la feuille n’est pas publiée', async () => {
      prisma.celebrationOccurrence.findFirst.mockResolvedValue(
        full({ sheet: { status: 'DRAFT', steps: [{ id: 's1', title: 'x', order: 1 }] } }),
      );
      const res = await service.getCelebration('o1');
      expect(res.sheetStatus).toBe('IN_PREPARATION');
      expect(res.steps).toEqual([]);
    });

    it('masque le déroulement d’une date annulée', async () => {
      prisma.celebrationOccurrence.findFirst.mockResolvedValue(
        full({ status: 'CANCELLED', cancelReason: 'Pèlerinage' }),
      );
      const res = await service.getCelebration('o1');
      expect(res.cancelled).toBe(true);
      expect(res.steps).toEqual([]);
    });

    it('404 pour une date non visible (série non annoncée, archivée, inconnue)', async () => {
      prisma.celebrationOccurrence.findFirst.mockResolvedValue(null);
      await expect(service.getCelebration('o1')).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.celebrationOccurrence.findFirst.mock.calls[0][0].where).toEqual({
        id: 'o1',
        celebration: { announced: true, archivedAt: null },
      });
    });
  });

  describe('getCalendar', () => {
    beforeEach(() => {
      prisma.parish.findUnique.mockResolvedValue({ timezone: 'Africa/Douala' });
      prisma.celebrationOccurrence.findMany.mockResolvedValue([
        row(),
        row({ id: 'o2', status: 'CANCELLED' }),
      ]);
    });

    it('borne le mois dans le fuseau de la paroisse et ne lit que les dates visibles', async () => {
      const res = await service.getCalendar('p1', { month: '2026-10' });
      const { where, orderBy } = prisma.celebrationOccurrence.findMany.mock.calls[0][0];
      expect(where.startsAt.gte.toISOString()).toBe('2026-09-30T23:00:00.000Z');
      expect(where.startsAt.lt.toISOString()).toBe('2026-10-31T23:00:00.000Z');
      expect(where.parishId).toBe('p1');
      expect(where.celebration).toEqual({ announced: true, archivedAt: null });
      // Les dates passées et annulées font partie du calendrier.
      expect(where).not.toHaveProperty('status');
      expect(orderBy).toEqual({ startsAt: 'asc' });
      expect(res).toMatchObject({ month: '2026-10', timezone: 'Africa/Douala' });
      expect(res.items.map((c) => [c.id, c.cancelled])).toEqual([
        ['o1', false],
        ['o2', true],
      ]);
    });

    it('sans mois : le mois courant de la paroisse', async () => {
      const res = await service.getCalendar('p1', {});
      expect(res.month).toMatch(/^\d{4}-\d{2}$/);
    });

    it('404 si la paroisse n’existe pas', async () => {
      prisma.parish.findUnique.mockResolvedValue(null);
      await expect(service.getCalendar('x', {})).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('listes d’une paroisse', () => {
    it('404 si la paroisse n’existe pas (pas de liste vide trompeuse)', async () => {
      prisma.parish.findUnique.mockResolvedValue(null);
      await expect(service.listCelebrations('x')).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.listAnnouncements('x')).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.listActivities('x')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('les dates sont triées par ordre croissant, annulées comprises, au fuseau de la paroisse', async () => {
      prisma.parish.findUnique.mockResolvedValue({ timezone: 'Africa/Douala' });
      prisma.celebrationOccurrence.findMany.mockResolvedValue([
        row(),
        row({ id: 'o2', status: 'CANCELLED' }),
      ]);
      const res = await service.listCelebrations('p1');
      const { where, orderBy } = prisma.celebrationOccurrence.findMany.mock.calls[0][0];
      expect(orderBy).toEqual({ startsAt: 'asc' });
      expect(where.celebration).toEqual({ announced: true, archivedAt: null });
      expect(where).not.toHaveProperty('status');
      expect(res.map((c) => [c.id, c.cancelled, c.timezone])).toEqual([
        ['o1', false, 'Africa/Douala'],
        ['o2', true, 'Africa/Douala'],
      ]);
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
