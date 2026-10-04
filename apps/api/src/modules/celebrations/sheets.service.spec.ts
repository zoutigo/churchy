import { BadRequestException, ConflictException, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SheetsService } from './sheets.service';

type Fn = jest.Mock;

const NOW = new Date('2026-10-03T12:00:00.000Z');
const FUTURE = new Date('2026-10-11T09:00:00.000Z');
const PAST = new Date('2026-10-03T08:00:00.000Z');

describe('SheetsService', () => {
  let prisma: {
    preparationSheet: { findUnique: Fn; findUniqueOrThrow: Fn; create: Fn; update: Fn };
    celebrationOccurrence: { findUnique: Fn };
    celebrationTemplate: { findUnique: Fn };
    celebrationStep: {
      findMany: Fn;
      findUnique: Fn;
      create: Fn;
      update: Fn;
      delete: Fn;
      deleteMany: Fn;
      aggregate: Fn;
    };
    content: { findUnique: Fn };
    $transaction: Fn;
  };
  let notifications: { celebrationPublished: Fn };
  let service: SheetsService;

  beforeEach(() => {
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
      preparationSheet: {
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      celebrationOccurrence: { findUnique: jest.fn() },
      celebrationTemplate: { findUnique: jest.fn() },
      celebrationStep: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
        delete: jest.fn().mockResolvedValue({}),
        deleteMany: jest.fn().mockResolvedValue({}),
        aggregate: jest.fn().mockResolvedValue({ _max: { order: 3 } }),
      },
      content: { findUnique: jest.fn() },
      $transaction: jest.fn(async (arg: unknown) =>
        typeof arg === 'function' ? arg(prisma) : Promise.all(arg as Promise<unknown>[]),
      ),
    };
    notifications = { celebrationPublished: jest.fn().mockResolvedValue(undefined) };
    service = new SheetsService(
      prisma as unknown as PrismaService,
      notifications as unknown as NotificationsService,
    );
  });

  afterEach(() => jest.useRealTimers());

  const sheetRow = (over: Record<string, unknown> = {}, occOver: Record<string, unknown> = {}) => ({
    id: 'sh1',
    occurrenceId: 'o1',
    templateId: 't1',
    status: 'DRAFT',
    publishedAt: null,
    steps: [],
    occurrence: {
      id: 'o1',
      celebrationId: 'c1',
      parishId: 'p1',
      startsAt: FUTURE,
      status: 'SCHEDULED',
      celebration: { title: 'Messe du dimanche' },
      ...occOver,
    },
    ...over,
  });
  const step = (key: string, over: Record<string, unknown> = {}) => ({
    id: `st-${key}`,
    sheetId: 'sh1',
    key,
    title: key,
    order: 1,
    templateStepId: `ts-${key}`,
    contentId: null,
    customText: null,
    ...over,
  });
  const tStep = (key: string, order: number) => ({ id: `ts-${key}`, key, title: key, order });
  const template = (keys: string[], parishId = 'p1') => ({
    id: 't2',
    parishId,
    steps: keys.map((k, i) => tStep(k, i + 1)),
  });

  describe('createForOccurrence', () => {
    const occurrence = (over: Record<string, unknown> = {}) => ({
      id: 'o1',
      parishId: 'p1',
      startsAt: FUTURE,
      status: 'SCHEDULED',
      sheet: null,
      celebration: { defaultTemplateId: 't1' },
      ...over,
    });

    beforeEach(() => {
      prisma.preparationSheet.create.mockResolvedValue(sheetRow());
      prisma.celebrationTemplate.findUnique.mockResolvedValue(template(['entrance', 'psalm']));
    });

    it('utilise le modèle par défaut de la série quand rien n’est précisé', async () => {
      prisma.celebrationOccurrence.findUnique.mockResolvedValue(occurrence());
      await service.createForOccurrence('o1', {});
      expect(prisma.celebrationTemplate.findUnique.mock.calls[0][0].where.id).toBe('t1');
      const { data } = prisma.preparationSheet.create.mock.calls[0][0];
      expect(data.templateId).toBe('t2'); // id du modèle retourné par le mock
      expect(data.steps.create).toEqual([
        { templateStepId: 'ts-entrance', key: 'entrance', title: 'entrance', order: 1 },
        { templateStepId: 'ts-psalm', key: 'psalm', title: 'psalm', order: 2 },
      ]);
    });

    it('utilise le modèle choisi à la préparation', async () => {
      prisma.celebrationOccurrence.findUnique.mockResolvedValue(occurrence());
      await service.createForOccurrence('o1', { templateId: 'autre' });
      expect(prisma.celebrationTemplate.findUnique.mock.calls[0][0].where.id).toBe('autre');
    });

    it('crée une feuille vide (à la volée) avec templateId null', async () => {
      prisma.celebrationOccurrence.findUnique.mockResolvedValue(occurrence());
      await service.createForOccurrence('o1', { templateId: null });
      expect(prisma.celebrationTemplate.findUnique).not.toHaveBeenCalled();
      const { data } = prisma.preparationSheet.create.mock.calls[0][0];
      expect(data.templateId).toBeNull();
      expect(data.steps.create).toEqual([]);
    });

    it('sans modèle par défaut ni choix : feuille vide', async () => {
      prisma.celebrationOccurrence.findUnique.mockResolvedValue(
        occurrence({ celebration: { defaultTemplateId: null } }),
      );
      await service.createForOccurrence('o1', {});
      expect(prisma.preparationSheet.create.mock.calls[0][0].data.steps.create).toEqual([]);
    });

    it('refuse le modèle d’une autre paroisse', async () => {
      prisma.celebrationOccurrence.findUnique.mockResolvedValue(occurrence());
      prisma.celebrationTemplate.findUnique.mockResolvedValue(template(['x'], 'autre'));
      await expect(service.createForOccurrence('o1', { templateId: 't9' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.preparationSheet.create).not.toHaveBeenCalled();
    });

    it('est idempotente : renvoie la feuille existante', async () => {
      prisma.celebrationOccurrence.findUnique.mockResolvedValue(
        occurrence({ sheet: { id: 'sh1' } }),
      );
      prisma.preparationSheet.findUnique.mockResolvedValue(sheetRow());
      const res = await service.createForOccurrence('o1', {});
      expect(res.id).toBe('sh1');
      expect(prisma.preparationSheet.create).not.toHaveBeenCalled();
    });

    it('refuse de recréer une feuille avec un autre modèle (utiliser « changer de modèle »)', async () => {
      prisma.celebrationOccurrence.findUnique.mockResolvedValue(
        occurrence({ sheet: { id: 'sh1' } }),
      );
      await expect(service.createForOccurrence('o1', { templateId: 't2' })).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('refuse une date passée ou annulée', async () => {
      prisma.celebrationOccurrence.findUnique.mockResolvedValue(occurrence({ startsAt: PAST }));
      await expect(service.createForOccurrence('o1', {})).rejects.toBeInstanceOf(ConflictException);
      prisma.celebrationOccurrence.findUnique.mockResolvedValue(
        occurrence({ status: 'CANCELLED' }),
      );
      await expect(service.createForOccurrence('o1', {})).rejects.toBeInstanceOf(ConflictException);
    });

    it('en cas de création simultanée, récupère la feuille de l’autre requête', async () => {
      prisma.celebrationOccurrence.findUnique.mockResolvedValue(occurrence());
      prisma.preparationSheet.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x' }),
      );
      prisma.preparationSheet.findUniqueOrThrow.mockResolvedValue({ id: 'sh1' });
      prisma.preparationSheet.findUnique.mockResolvedValue(sheetRow());
      await expect(service.createForOccurrence('o1', {})).resolves.toMatchObject({ id: 'sh1' });
    });

    it('404 si la date n’existe pas', async () => {
      prisma.celebrationOccurrence.findUnique.mockResolvedValue(null);
      await expect(service.createForOccurrence('x', {})).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('changeTemplate', () => {
    beforeEach(() => {
      prisma.preparationSheet.findUnique.mockResolvedValue(sheetRow());
    });

    const current = [
      step('entrance', { order: 1, contentId: 'c-chant' }), // remplie, présente dans le nouveau modèle
      step('kyrie', { order: 2 }), // vide, absente du nouveau modèle → retirée
      step('gloria', { order: 3, customText: 'Gloria de Lourdes' }), // remplie, absente → libre
      step('free-ab12', { order: 4, templateStepId: null }), // libre vide : toujours conservée
    ];

    it('aperçu : indique ce qui sera conservé, ajouté, retiré, gardé comme libre — sans rien écrire', async () => {
      prisma.celebrationTemplate.findUnique.mockResolvedValue(template(['entrance', 'psalm']));
      prisma.celebrationStep.findMany.mockResolvedValue(current);

      const res = await service.changeTemplate('sh1', { templateId: 't2', dryRun: true });

      expect(res.applied).toBe(false);
      expect(res.report).toEqual({
        kept: [{ key: 'entrance', title: 'entrance' }],
        added: [{ key: 'psalm', title: 'psalm' }],
        removed: [{ key: 'kyrie', title: 'kyrie' }],
        keptAsFree: [{ key: 'gloria', title: 'gloria' }],
      });
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.celebrationStep.update).not.toHaveBeenCalled();
      expect(prisma.celebrationStep.deleteMany).not.toHaveBeenCalled();
    });

    it('applique : conserve le contenu par key, ajoute, retire les vides, garde les remplies', async () => {
      prisma.celebrationTemplate.findUnique.mockResolvedValue(template(['entrance', 'psalm']));
      prisma.celebrationStep.findMany.mockResolvedValue(current);

      const res = await service.changeTemplate('sh1', { templateId: 't2' });

      expect(res.applied).toBe(true);
      // l'étape vide sans équivalent est retirée, rien d'autre
      expect(prisma.celebrationStep.deleteMany).toHaveBeenCalledWith({
        where: { sheetId: 'sh1', key: { in: ['kyrie'] } },
      });
      // l'étape rapprochée garde son contenu : on ne met à jour que titre / ordre / lien au modèle
      expect(prisma.celebrationStep.update).toHaveBeenCalledWith({
        where: { id: 'st-entrance' },
        data: { templateStepId: 'ts-entrance', title: 'entrance', order: 1 },
      });
      for (const [arg] of prisma.celebrationStep.update.mock.calls) {
        expect(arg.data).not.toHaveProperty('contentId');
        expect(arg.data).not.toHaveProperty('customText');
      }
      // l'étape manquante du nouveau modèle est créée vide
      expect(prisma.celebrationStep.create).toHaveBeenCalledWith({
        data: {
          sheetId: 'sh1',
          templateStepId: 'ts-psalm',
          key: 'psalm',
          title: 'psalm',
          order: 2,
        },
      });
      // la remplie sans équivalent devient libre, à la suite du modèle ; la libre vide reste
      expect(prisma.celebrationStep.update).toHaveBeenCalledWith({
        where: { id: 'st-gloria' },
        data: { templateStepId: null, order: 3 },
      });
      expect(prisma.celebrationStep.update).toHaveBeenCalledWith({
        where: { id: 'st-free-ab12' },
        data: { templateStepId: null, order: 4 },
      });
      expect(prisma.preparationSheet.update).toHaveBeenCalledWith({
        where: { id: 'sh1' },
        data: { templateId: 't2' },
      });
    });

    it('passer à « à la volée » (null) détache la feuille sans rien perdre', async () => {
      prisma.celebrationStep.findMany.mockResolvedValue(current);

      const res = await service.changeTemplate('sh1', { templateId: null });

      expect(prisma.celebrationStep.deleteMany).not.toHaveBeenCalled();
      expect(prisma.celebrationStep.create).not.toHaveBeenCalled();
      expect(prisma.celebrationStep.update).toHaveBeenCalledTimes(4);
      expect(prisma.preparationSheet.update).toHaveBeenCalledWith({
        where: { id: 'sh1' },
        data: { templateId: null },
      });
      expect(res.report.removed).toEqual([]);
      expect(res.report.keptAsFree.map((s) => s.key)).toEqual(['entrance', 'kyrie', 'gloria']);
    });

    it('rapproche aussi une étape libre dont la key correspond à une étape du nouveau modèle', async () => {
      prisma.celebrationTemplate.findUnique.mockResolvedValue(template(['gloria']));
      prisma.celebrationStep.findMany.mockResolvedValue([
        step('gloria', { templateStepId: null, customText: 'Gloria' }),
      ]);
      const res = await service.changeTemplate('sh1', { templateId: 't2' });
      expect(res.report.kept).toEqual([{ key: 'gloria', title: 'gloria' }]);
      expect(prisma.celebrationStep.create).not.toHaveBeenCalled();
    });

    it('refuse sur une date passée, et pour le modèle d’une autre paroisse', async () => {
      prisma.preparationSheet.findUnique.mockResolvedValue(sheetRow({}, { startsAt: PAST }));
      await expect(service.changeTemplate('sh1', { templateId: null })).rejects.toBeInstanceOf(
        ConflictException,
      );
      prisma.preparationSheet.findUnique.mockResolvedValue(sheetRow());
      prisma.celebrationTemplate.findUnique.mockResolvedValue(template(['x'], 'autre'));
      await expect(service.changeTemplate('sh1', { templateId: 't9' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('étapes à la volée', () => {
    beforeEach(() => {
      prisma.preparationSheet.findUnique.mockResolvedValue(sheetRow());
    });

    it('ajoute une étape libre à la suite des autres', async () => {
      await service.addStep('sh1', { title: 'Chant à Marie' });
      const { data } = prisma.celebrationStep.create.mock.calls[0][0];
      expect(data).toMatchObject({ sheetId: 'sh1', title: 'Chant à Marie', order: 4 });
      expect(data.key).toMatch(/^free-[0-9a-f]{8}$/);
      expect(data).not.toHaveProperty('templateStepId');
    });

    it('refuse de modifier une étape d’une autre feuille', async () => {
      prisma.celebrationStep.findUnique.mockResolvedValue(step('x', { sheetId: 'autre' }));
      await expect(service.updateStep('sh1', 'st-x', { customText: 'a' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
      await expect(service.removeStep('sh1', 'st-x')).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.celebrationStep.update).not.toHaveBeenCalled();
      expect(prisma.celebrationStep.delete).not.toHaveBeenCalled();
    });

    it('refuse un contenu d’une autre paroisse', async () => {
      prisma.celebrationStep.findUnique.mockResolvedValue(step('x'));
      prisma.content.findUnique.mockResolvedValue({ parishId: 'autre' });
      await expect(service.updateStep('sh1', 'st-x', { contentId: 'k1' })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('lie un contenu, en pose un texte, ou retire le contenu (null)', async () => {
      prisma.celebrationStep.findUnique.mockResolvedValue(step('x'));
      prisma.content.findUnique.mockResolvedValue({ parishId: 'p1' });
      await service.updateStep('sh1', 'st-x', { contentId: 'k1' });
      expect(prisma.celebrationStep.update.mock.calls[0][0].data.contentId).toBe('k1');
      await service.updateStep('sh1', 'st-x', { contentId: null });
      expect(prisma.celebrationStep.update.mock.calls[1][0].data.contentId).toBeNull();
      await service.updateStep('sh1', 'st-x', { customText: 'Lecture libre' });
      expect(prisma.celebrationStep.update.mock.calls[2][0].data.customText).toBe('Lecture libre');
    });

    it('supprime une étape', async () => {
      prisma.celebrationStep.findUnique.mockResolvedValue(step('x'));
      await service.removeStep('sh1', 'st-x');
      expect(prisma.celebrationStep.delete).toHaveBeenCalledWith({ where: { id: 'st-x' } });
    });

    it('réordonne avec exactement les étapes de la feuille', async () => {
      prisma.celebrationStep.findMany.mockResolvedValue([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
      await service.reorderSteps('sh1', { stepIds: ['c', 'a', 'b'] });
      expect(
        prisma.celebrationStep.update.mock.calls.map(([a]) => [a.where.id, a.data.order]),
      ).toEqual([
        ['c', 1],
        ['a', 2],
        ['b', 3],
      ]);
    });

    it.each([
      ['étape manquante', ['a', 'b']],
      ['étape inconnue', ['a', 'b', 'z']],
      ['doublon', ['a', 'a', 'b']],
    ])('refuse un ordre invalide (%s)', async (_n, stepIds) => {
      prisma.celebrationStep.findMany.mockResolvedValue([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
      await expect(service.reorderSteps('sh1', { stepIds })).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.celebrationStep.update).not.toHaveBeenCalled();
    });

    it('toute modification est refusée sur une date passée ou annulée', async () => {
      for (const occ of [{ startsAt: PAST }, { status: 'CANCELLED' }]) {
        prisma.preparationSheet.findUnique.mockResolvedValue(sheetRow({}, occ));
        await expect(service.addStep('sh1', { title: 'x' })).rejects.toBeInstanceOf(
          ConflictException,
        );
        await expect(service.updateStep('sh1', 's', {})).rejects.toBeInstanceOf(ConflictException);
        await expect(service.removeStep('sh1', 's')).rejects.toBeInstanceOf(ConflictException);
        await expect(service.reorderSteps('sh1', { stepIds: ['a'] })).rejects.toBeInstanceOf(
          ConflictException,
        );
      }
      expect(prisma.celebrationStep.create).not.toHaveBeenCalled();
      expect(prisma.celebrationStep.update).not.toHaveBeenCalled();
    });
  });

  describe('publish / unpublish', () => {
    const published = { publishedAt: new Date('2026-10-03T12:00:00.000Z') };

    beforeEach(() => {
      prisma.preparationSheet.findUnique.mockResolvedValue(sheetRow());
      prisma.preparationSheet.update.mockResolvedValue(published);
    });

    it('publie la feuille et enfile UNE notification pour cette date', async () => {
      await service.publish('sh1');
      expect(prisma.preparationSheet.update).toHaveBeenCalledWith({
        where: { id: 'sh1' },
        data: { status: 'PUBLISHED', publishedAt: NOW },
      });
      expect(notifications.celebrationPublished).toHaveBeenCalledTimes(1);
      expect(notifications.celebrationPublished).toHaveBeenCalledWith({
        celebrationId: 'c1',
        occurrenceId: 'o1',
        parishId: 'p1',
        title: 'Messe du dimanche',
        date: FUTURE.toISOString(),
        publishedAt: '2026-10-03T12:00:00.000Z',
      });
    });

    it('refuse de republier une feuille déjà publiée', async () => {
      prisma.preparationSheet.findUnique.mockResolvedValue(sheetRow({ status: 'PUBLISHED' }));
      await expect(service.publish('sh1')).rejects.toBeInstanceOf(BadRequestException);
      expect(notifications.celebrationPublished).not.toHaveBeenCalled();
    });

    it('refuse de publier une date passée ou annulée', async () => {
      prisma.preparationSheet.findUnique.mockResolvedValue(sheetRow({}, { startsAt: PAST }));
      await expect(service.publish('sh1')).rejects.toBeInstanceOf(ConflictException);
      prisma.preparationSheet.findUnique.mockResolvedValue(sheetRow({}, { status: 'CANCELLED' }));
      await expect(service.publish('sh1')).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.preparationSheet.update).not.toHaveBeenCalled();
    });

    it('ne fait pas échouer la publication si l’enfilage échoue', async () => {
      notifications.celebrationPublished.mockRejectedValue(new Error('redis down'));
      jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
      await expect(service.publish('sh1')).resolves.toMatchObject({ id: 'sh1' });
    });

    it('dépublie une feuille publiée, pas un brouillon', async () => {
      prisma.preparationSheet.findUnique.mockResolvedValue(sheetRow({ status: 'PUBLISHED' }));
      await service.unpublish('sh1');
      expect(prisma.preparationSheet.update).toHaveBeenCalledWith({
        where: { id: 'sh1' },
        data: { status: 'DRAFT', publishedAt: null },
      });
      prisma.preparationSheet.findUnique.mockResolvedValue(sheetRow());
      await expect(service.unpublish('sh1')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('404 si la feuille n’existe pas', async () => {
      prisma.preparationSheet.findUnique.mockResolvedValue(null);
      await expect(service.publish('x')).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.findById('x')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
