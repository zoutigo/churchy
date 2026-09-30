import { BadRequestException } from '@nestjs/common';
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
    service = new CelebrationsService(prisma as any, notifications as any);
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
    jest.spyOn((service as any).logger, 'error').mockImplementation(() => undefined);

    await expect(service.publish('c1')).resolves.toBe(published);
  });
});
