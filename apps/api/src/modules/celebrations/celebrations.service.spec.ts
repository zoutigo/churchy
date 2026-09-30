import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CelebrationsService } from './celebrations.service';

describe('CelebrationsService.publish', () => {
  const draft = { id: 'c1', status: 'DRAFT', steps: [], template: {} };
  const published = {
    id: 'c1',
    parishId: 'p1',
    title: 'Messe',
    status: 'PUBLISHED',
    date: new Date('2026-10-04T09:00:00.000Z'),
    publishedAt: new Date('2026-09-30T18:00:00.000Z'),
  };
  let prisma: { celebration: { findUnique: jest.Mock; update: jest.Mock } };
  let notifications: { celebrationPublished: jest.Mock };
  let service: CelebrationsService;

  beforeEach(() => {
    prisma = { celebration: { findUnique: jest.fn(), update: jest.fn() } };
    notifications = { celebrationPublished: jest.fn().mockResolvedValue(undefined) };
    service = new CelebrationsService(
      prisma as unknown as PrismaService,
      notifications as unknown as NotificationsService,
    );
  });

  it('passe la célébration en PUBLISHED et enfile une notification', async () => {
    prisma.celebration.findUnique.mockResolvedValue(draft);
    prisma.celebration.update.mockResolvedValue(published);

    const res = await service.publish('c1');

    expect(prisma.celebration.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'PUBLISHED' }) }),
    );
    expect(notifications.celebrationPublished).toHaveBeenCalledWith({
      celebrationId: 'c1',
      parishId: 'p1',
      title: 'Messe',
      date: '2026-10-04T09:00:00.000Z',
      publishedAt: '2026-09-30T18:00:00.000Z',
    });
    expect(res).toBe(published);
  });

  it('refuse de republier une célébration déjà publiée', async () => {
    prisma.celebration.findUnique.mockResolvedValue({ ...draft, status: 'PUBLISHED' });
    await expect(service.publish('c1')).rejects.toBeInstanceOf(BadRequestException);
    expect(notifications.celebrationPublished).not.toHaveBeenCalled();
  });

  it('ne fait pas échouer la publication si l’enfilage échoue', async () => {
    prisma.celebration.findUnique.mockResolvedValue(draft);
    prisma.celebration.update.mockResolvedValue(published);
    notifications.celebrationPublished.mockRejectedValue(new Error('redis down'));
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    await expect(service.publish('c1')).resolves.toBe(published);
  });
});

describe('CelebrationsService — isolation entre paroisses', () => {
  type Fn = jest.Mock;
  let prisma: {
    celebrationTemplate: { findUnique: Fn };
    celebration: { create: Fn };
    celebrationStep: { findUnique: Fn; update: Fn };
    content: { findUnique: Fn };
  };
  let service: CelebrationsService;

  beforeEach(() => {
    prisma = {
      celebrationTemplate: { findUnique: jest.fn() },
      celebration: { create: jest.fn().mockResolvedValue({ id: 'c1' }) },
      celebrationStep: { findUnique: jest.fn(), update: jest.fn().mockResolvedValue({}) },
      content: { findUnique: jest.fn() },
    };
    service = new CelebrationsService(
      prisma as unknown as PrismaService,
      { celebrationPublished: jest.fn() } as unknown as NotificationsService,
    );
  });

  describe('create', () => {
    const dto = { templateId: 't1', title: 'Messe', date: '2026-10-04T09:00:00.000Z' };

    it('refuse un modèle appartenant à une autre paroisse', async () => {
      prisma.celebrationTemplate.findUnique.mockResolvedValue({
        id: 't1',
        parishId: 'autre',
        steps: [],
      });
      await expect(service.create('p1', dto, 'u1')).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.celebration.create).not.toHaveBeenCalled();
    });

    it('accepte un modèle de la même paroisse', async () => {
      prisma.celebrationTemplate.findUnique.mockResolvedValue({
        id: 't1',
        parishId: 'p1',
        steps: [],
      });
      await service.create('p1', dto, 'u1');
      expect(prisma.celebration.create).toHaveBeenCalled();
    });
  });

  describe('updateStep', () => {
    const step = (over: Record<string, unknown> = {}) => ({
      id: 's1',
      celebrationId: 'c1',
      celebration: { parishId: 'p1' },
      ...over,
    });

    it('refuse une étape qui n’appartient pas à la célébration de l’URL', async () => {
      prisma.celebrationStep.findUnique.mockResolvedValue(
        step({ celebrationId: 'autre-celebration' }),
      );
      await expect(service.updateStep('c1', 's1', { customText: 'x' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.celebrationStep.update).not.toHaveBeenCalled();
    });

    it('refuse un contenu appartenant à une autre paroisse', async () => {
      prisma.celebrationStep.findUnique.mockResolvedValue(step());
      prisma.content.findUnique.mockResolvedValue({ id: 'k1', parishId: 'autre' });
      await expect(service.updateStep('c1', 's1', { contentId: 'k1' })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('met à jour l’étape avec un contenu de la même paroisse', async () => {
      prisma.celebrationStep.findUnique.mockResolvedValue(step());
      prisma.content.findUnique.mockResolvedValue({ id: 'k1', parishId: 'p1' });
      await service.updateStep('c1', 's1', { contentId: 'k1' });
      expect(prisma.celebrationStep.update).toHaveBeenCalled();
    });
  });
});
