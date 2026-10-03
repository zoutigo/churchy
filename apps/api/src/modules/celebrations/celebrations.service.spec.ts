import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ParishRole, type AddOccurrencesDto, type CreateCelebrationDto } from '@churchy/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { CelebrationsService } from './celebrations.service';

type Fn = jest.Mock;

const NOW = new Date('2026-10-03T12:00:00.000Z');

describe('CelebrationsService', () => {
  let prisma: {
    parish: { findUnique: Fn };
    celebration: { create: Fn; findMany: Fn; findUnique: Fn; update: Fn };
    celebrationTemplate: { findUnique: Fn };
    celebrationOccurrence: {
      createMany: Fn;
      findUnique: Fn;
      findUniqueOrThrow: Fn;
      update: Fn;
    };
  };
  let service: CelebrationsService;

  beforeEach(() => {
    // Seule l'horloge est simulée : les promesses continuent de fonctionner normalement.
    jest.useFakeTimers({
      now: NOW,
      doNotFake: [
        'nextTick',
        'setImmediate',
        'clearImmediate',
        'setInterval',
        'clearInterval',
        'setTimeout',
        'clearTimeout',
        'queueMicrotask',
        'performance',
        'hrtime',
      ],
    });
    prisma = {
      parish: { findUnique: jest.fn().mockResolvedValue({ timezone: 'Africa/Douala' }) },
      celebration: {
        create: jest.fn().mockResolvedValue({ id: 'c1' }),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
      celebrationTemplate: { findUnique: jest.fn() },
      celebrationOccurrence: {
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    service = new CelebrationsService(prisma as unknown as PrismaService);
  });

  afterEach(() => jest.useRealTimers());

  const series = (over: Record<string, unknown> = {}) => ({
    id: 'c1',
    parishId: 'p1',
    title: 'Messe du dimanche',
    type: 'SUNDAY_MASS',
    location: 'Église',
    description: '<p>Bienvenue</p>',
    internalNote: 'Micro à vérifier',
    announced: true,
    archivedAt: null,
    parish: { timezone: 'Africa/Douala' },
    defaultTemplate: null,
    occurrences: [],
    ...over,
  });
  const occ = (id: string, startsAt: string, over: Record<string, unknown> = {}) => ({
    id,
    celebrationId: 'c1',
    startsAt: new Date(startsAt),
    status: 'SCHEDULED',
    cancelReason: null,
    description: null,
    internalNote: 'Point de vigilance',
    sheet: null,
    ...over,
  });

  describe('create', () => {
    const base: CreateCelebrationDto = {
      title: 'Messe du dimanche',
      type: 'SUNDAY_MASS' as CreateCelebrationDto['type'],
      schedule: {
        kind: 'recurrence',
        startDate: '2026-10-04',
        endDate: '2026-10-18',
        time: '10:00',
        weekdays: [0],
      },
    };

    beforeEach(() => {
      prisma.celebration.findUnique.mockResolvedValue(series());
    });

    it('déplie une récurrence en dates, à l’heure locale de la paroisse', async () => {
      await service.create('p1', base, 'u1');
      const { data } = prisma.celebration.create.mock.calls[0][0];
      expect(
        data.occurrences.create.map((o: { startsAt: Date }) => o.startsAt.toISOString()),
      ).toEqual([
        '2026-10-04T09:00:00.000Z',
        '2026-10-11T09:00:00.000Z',
        '2026-10-18T09:00:00.000Z',
      ]);
      expect(data.occurrences.create[0].parishId).toBe('p1');
      expect(data).toMatchObject({ parishId: 'p1', createdById: 'u1', announced: false });
    });

    it('crée sans feuille : les feuilles naissent à la demande', async () => {
      await service.create('p1', base, 'u1');
      expect(prisma.celebration.create.mock.calls[0][0].data).not.toHaveProperty('sheets');
    });

    it('mémorise le modèle comme modèle par défaut quand il est donné', async () => {
      prisma.celebrationTemplate.findUnique.mockResolvedValue({ parishId: 'p1' });
      await service.create('p1', { ...base, templateId: 't1' }, 'u1');
      expect(prisma.celebration.create.mock.calls[0][0].data.defaultTemplateId).toBe('t1');
    });

    it('refuse le modèle d’une autre paroisse', async () => {
      prisma.celebrationTemplate.findUnique.mockResolvedValue({ parishId: 'autre' });
      await expect(
        service.create('p1', { ...base, templateId: 't1' }, 'u1'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.celebration.create).not.toHaveBeenCalled();
    });

    it('nettoie le HTML de la description (pas de script)', async () => {
      await service.create(
        'p1',
        { ...base, description: '<p>Bonjour</p><script>alert(1)</script>' },
        'u1',
      );
      const { description } = prisma.celebration.create.mock.calls[0][0].data;
      expect(description).toContain('Bonjour');
      expect(description).not.toContain('script');
    });

    it('refuse une date passée ou au-delà d’un an, sans rien créer', async () => {
      for (const date of ['2026-10-02', '2027-10-05']) {
        await expect(
          service.create(
            'p1',
            { ...base, schedule: { kind: 'dates', dates: [{ date, time: '10:00' }] } },
            'u1',
          ),
        ).rejects.toBeInstanceOf(BadRequestException);
      }
      expect(prisma.celebration.create).not.toHaveBeenCalled();
    });

    it('404 si la paroisse n’existe pas', async () => {
      prisma.parish.findUnique.mockResolvedValue(null);
      await expect(service.create('x', base, 'u1')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('findById (notes internes)', () => {
    beforeEach(() => {
      prisma.celebration.findUnique.mockResolvedValue(
        series({ occurrences: [occ('o1', '2026-10-04T09:00:00.000Z')] }),
      );
    });

    it.each([ParishRole.PARISH_ADMIN, ParishRole.PREPARER, 'SUPER_ADMIN' as const])(
      '%s voit les notes de la série et des dates',
      async (role) => {
        const res = await service.findById('c1', role);
        expect(res.internalNote).toBe('Micro à vérifier');
        expect(res.occurrences[0].internalNote).toBe('Point de vigilance');
      },
    );

    it.each([ParishRole.READER, ParishRole.VIEWER])(
      '%s ne voit aucune note interne (la clé est absente)',
      async (role) => {
        const res = await service.findById('c1', role);
        expect(res).not.toHaveProperty('internalNote');
        expect(res.occurrences[0]).not.toHaveProperty('internalNote');
        expect(JSON.stringify(res)).not.toContain('vigilance');
        expect(JSON.stringify(res)).not.toContain('Micro');
      },
    );

    it('marque les dates passées et signale la fin de série proche', async () => {
      prisma.celebration.findUnique.mockResolvedValue(
        series({
          occurrences: [
            occ('o0', '2026-09-27T09:00:00.000Z'),
            occ('o1', '2026-10-20T09:00:00.000Z'),
          ],
        }),
      );
      const res = await service.findById('c1', ParishRole.PREPARER);
      expect(res.occurrences.map((o) => o.isPast)).toEqual([true, false]);
      expect(res.endingSoon).toBe(true);
      expect(res.lastOccurrenceAt).toBe('2026-10-20T09:00:00.000Z');
    });

    it('pas de rappel pour une série archivée', async () => {
      prisma.celebration.findUnique.mockResolvedValue(
        series({ archivedAt: NOW, occurrences: [occ('o1', '2026-10-20T09:00:00.000Z')] }),
      );
      expect((await service.findById('c1', ParishRole.PREPARER)).endingSoon).toBe(false);
    });

    it('404 si la série n’existe pas', async () => {
      prisma.celebration.findUnique.mockResolvedValue(null);
      await expect(service.findById('x', ParishRole.PREPARER)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('findByParish', () => {
    const row = (id: string, dates: string[], over: Record<string, unknown> = {}) => ({
      id,
      title: id,
      type: 'SUNDAY_MASS',
      location: null,
      announced: true,
      archivedAt: null,
      defaultTemplate: null,
      occurrences: dates.map((d, i) => ({
        id: `${id}-${i}`,
        startsAt: new Date(d),
        status: 'SCHEDULED',
      })),
      ...over,
    });

    it('trie : séries à venir par prochaine date, puis séries terminées (récentes d’abord)', async () => {
      prisma.celebration.findMany.mockResolvedValue([
        row('terminee-ancienne', ['2026-05-01T09:00:00.000Z']),
        row('plus-tard', ['2026-12-01T09:00:00.000Z']),
        row('terminee-recente', ['2026-09-01T09:00:00.000Z']),
        row('bientot', ['2026-09-01T09:00:00.000Z', '2026-10-05T09:00:00.000Z']),
      ]);
      const res = await service.findByParish('p1');
      expect(res.map((c) => c.id)).toEqual([
        'bientot',
        'plus-tard',
        'terminee-recente',
        'terminee-ancienne',
      ]);
    });

    it('compte les dates, donne la prochaine et signale la fin proche', async () => {
      prisma.celebration.findMany.mockResolvedValue([
        row('c1', [
          '2026-09-27T09:00:00.000Z',
          '2026-10-04T09:00:00.000Z',
          '2026-10-25T09:00:00.000Z',
        ]),
      ]);
      const [item] = await service.findByParish('p1');
      expect(item).toMatchObject({
        occurrenceCount: 3,
        upcomingCount: 2,
        nextOccurrence: { id: 'c1-1', startsAt: '2026-10-04T09:00:00.000Z' },
        lastOccurrenceAt: '2026-10-25T09:00:00.000Z',
        endingSoon: true,
      });
    });

    it('la prochaine date saute les dates annulées quand une autre est maintenue', async () => {
      prisma.celebration.findMany.mockResolvedValue([
        row('c1', ['2026-10-04T09:00:00.000Z', '2026-10-11T09:00:00.000Z'], {
          occurrences: [
            { id: 'a', startsAt: new Date('2026-10-04T09:00:00.000Z'), status: 'CANCELLED' },
            { id: 'b', startsAt: new Date('2026-10-11T09:00:00.000Z'), status: 'SCHEDULED' },
          ],
        }),
      ]);
      expect((await service.findByParish('p1'))[0].nextOccurrence?.id).toBe('b');
    });

    it('une série sans date à venir n’a pas de prochaine date ni de rappel', async () => {
      prisma.celebration.findMany.mockResolvedValue([row('c1', ['2026-05-01T09:00:00.000Z'])]);
      const [item] = await service.findByParish('p1');
      expect(item.nextOccurrence).toBeNull();
      expect(item.endingSoon).toBe(false);
      expect(item.upcomingCount).toBe(0);
    });
  });

  describe('update', () => {
    it('refuse de modifier une série dont toutes les dates sont passées', async () => {
      prisma.celebration.findUnique.mockResolvedValue({
        parishId: 'p1',
        occurrences: [{ startsAt: new Date('2026-09-01T09:00:00.000Z') }],
      });
      await expect(service.update('c1', { title: 'Autre' })).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.celebration.update).not.toHaveBeenCalled();
    });

    it('modifie une série qui a encore des dates à venir, en nettoyant la description', async () => {
      prisma.celebration.findUnique
        .mockResolvedValueOnce({
          parishId: 'p1',
          occurrences: [
            { startsAt: new Date('2026-09-01T09:00:00.000Z') },
            { startsAt: new Date('2026-10-11T09:00:00.000Z') },
          ],
        })
        .mockResolvedValue(series());
      await service.update('c1', { title: 'Nouveau', description: '<p>x</p><script>1</script>' });
      const { data } = prisma.celebration.update.mock.calls[0][0];
      expect(data.title).toBe('Nouveau');
      expect(data.description).not.toContain('script');
    });

    it('efface la description quand elle est vidée (null)', async () => {
      prisma.celebration.findUnique
        .mockResolvedValueOnce({ parishId: 'p1', occurrences: [] })
        .mockResolvedValue(series());
      await service.update('c1', { description: null });
      expect(prisma.celebration.update.mock.calls[0][0].data.description).toBeNull();
    });

    it('refuse un modèle par défaut d’une autre paroisse', async () => {
      prisma.celebration.findUnique.mockResolvedValue({ parishId: 'p1', occurrences: [] });
      prisma.celebrationTemplate.findUnique.mockResolvedValue({ parishId: 'autre' });
      await expect(service.update('c1', { defaultTemplateId: 't9' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('addOccurrences (prolongation)', () => {
    const schedule: AddOccurrencesDto['schedule'] = {
      kind: 'dates',
      dates: [{ date: '2026-11-01', time: '10:00' }],
    };

    beforeEach(() => {
      prisma.celebration.findUnique
        .mockResolvedValueOnce({
          parishId: 'p1',
          archivedAt: null,
          parish: { timezone: 'Africa/Douala' },
        })
        .mockResolvedValue(series());
    });

    it('ajoute les dates en ignorant celles qui existent déjà', async () => {
      await service.addOccurrences('c1', { schedule });
      expect(prisma.celebrationOccurrence.createMany).toHaveBeenCalledWith({
        data: [
          {
            celebrationId: 'c1',
            parishId: 'p1',
            startsAt: new Date('2026-11-01T09:00:00.000Z'),
          },
        ],
        skipDuplicates: true,
      });
    });

    it('refuse le passé et au-delà d’un an', async () => {
      await expect(
        service.addOccurrences('c1', {
          schedule: { kind: 'dates', dates: [{ date: '2026-09-01', time: '10:00' }] },
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.celebrationOccurrence.createMany).not.toHaveBeenCalled();
    });

    it('refuse de prolonger une série archivée', async () => {
      prisma.celebration.findUnique.mockReset();
      prisma.celebration.findUnique.mockResolvedValueOnce({
        parishId: 'p1',
        archivedAt: NOW,
        parish: { timezone: 'UTC' },
      });
      await expect(service.addOccurrences('c1', { schedule })).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('une date passée est immuable', () => {
    const past = () =>
      prisma.celebrationOccurrence.findUnique.mockResolvedValue({
        ...occ('o1', '2026-10-03T08:00:00.000Z'),
        parish: { timezone: 'Africa/Douala' },
      });

    it('refuse modification, annulation et rétablissement', async () => {
      past();
      await expect(
        service.updateOccurrence('o1', { description: 'Nouveau' }),
      ).rejects.toBeInstanceOf(ConflictException);
      await expect(service.cancelOccurrence('o1', {})).rejects.toBeInstanceOf(ConflictException);
      await expect(service.reinstateOccurrence('o1')).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.celebrationOccurrence.update).not.toHaveBeenCalled();
    });

    it('une date qui vient de commencer est déjà passée', async () => {
      prisma.celebrationOccurrence.findUnique.mockResolvedValue({
        ...occ('o1', NOW.toISOString()),
        parish: { timezone: 'UTC' },
      });
      await expect(service.cancelOccurrence('o1', {})).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('updateOccurrence', () => {
    beforeEach(() => {
      prisma.celebrationOccurrence.findUnique.mockResolvedValue({
        ...occ('o1', '2026-10-11T09:00:00.000Z'),
        parish: { timezone: 'Africa/Douala' },
      });
      prisma.celebrationOccurrence.findUniqueOrThrow.mockResolvedValue(
        occ('o1', '2026-10-12T15:30:00.000Z'),
      );
    });

    it('déplace la date en heure locale de la paroisse', async () => {
      await service.updateOccurrence('o1', { start: { date: '2026-10-12', time: '16:30' } });
      expect(prisma.celebrationOccurrence.update.mock.calls[0][0].data.startsAt).toEqual(
        new Date('2026-10-12T15:30:00.000Z'),
      );
    });

    it('refuse de déplacer dans le passé ou au-delà d’un an', async () => {
      for (const date of ['2026-10-01', '2027-11-01']) {
        await expect(
          service.updateOccurrence('o1', { start: { date, time: '10:00' } }),
        ).rejects.toBeInstanceOf(BadRequestException);
      }
      expect(prisma.celebrationOccurrence.update).not.toHaveBeenCalled();
    });

    it('conflit si la série a déjà une date à ce moment', async () => {
      prisma.celebrationOccurrence.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x' }),
      );
      await expect(
        service.updateOccurrence('o1', { start: { date: '2026-10-12', time: '16:30' } }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('nettoie la précision publique et conserve la note interne telle quelle', async () => {
      await service.updateOccurrence('o1', {
        description: '<p>Évêque présent</p><script>1</script>',
        internalNote: 'Prévoir la mitre',
      });
      const { data } = prisma.celebrationOccurrence.update.mock.calls[0][0];
      expect(data.description).toContain('Évêque');
      expect(data.description).not.toContain('script');
      expect(data.internalNote).toBe('Prévoir la mitre');
    });

    it('404 si la date n’existe pas', async () => {
      prisma.celebrationOccurrence.findUnique.mockResolvedValue(null);
      await expect(service.updateOccurrence('x', {})).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('annulation', () => {
    beforeEach(() => {
      prisma.celebrationOccurrence.findUnique.mockResolvedValue({
        ...occ('o1', '2026-10-11T09:00:00.000Z'),
        parish: { timezone: 'Africa/Douala' },
      });
      prisma.celebrationOccurrence.findUniqueOrThrow.mockResolvedValue(
        occ('o1', '2026-10-11T09:00:00.000Z', { status: 'CANCELLED' }),
      );
    });

    it('annule avec un motif facultatif', async () => {
      await service.cancelOccurrence('o1', { reason: 'Pèlerinage' });
      expect(prisma.celebrationOccurrence.update).toHaveBeenCalledWith({
        where: { id: 'o1' },
        data: { status: 'CANCELLED', cancelReason: 'Pèlerinage' },
      });
      await service.cancelOccurrence('o1', {});
      expect(prisma.celebrationOccurrence.update.mock.calls[1][0].data.cancelReason).toBeNull();
    });

    it('rétablit la date et efface le motif', async () => {
      await service.reinstateOccurrence('o1');
      expect(prisma.celebrationOccurrence.update).toHaveBeenCalledWith({
        where: { id: 'o1' },
        data: { status: 'SCHEDULED', cancelReason: null },
      });
    });
  });

  describe('archivage', () => {
    it('archive et désarchive la série', async () => {
      prisma.celebration.findUnique.mockResolvedValue(series());
      await service.archive('c1');
      expect(prisma.celebration.update.mock.calls[0][0].data.archivedAt).toEqual(NOW);
      await service.unarchive('c1');
      expect(prisma.celebration.update.mock.calls[1][0].data.archivedAt).toBeNull();
    });
  });
});
