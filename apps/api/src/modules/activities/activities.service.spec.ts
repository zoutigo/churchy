import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivitiesService } from './activities.service';

describe('ActivitiesService', () => {
  let prisma: { activity: { create: jest.Mock; findMany: jest.Mock; deleteMany: jest.Mock } };
  let service: ActivitiesService;

  beforeEach(() => {
    prisma = { activity: { create: jest.fn(), findMany: jest.fn(), deleteMany: jest.fn() } };
    service = new ActivitiesService(prisma as unknown as PrismaService);
  });

  it('convertit la date ISO et rattache l’activité à la paroisse de l’URL', async () => {
    await service.create(
      'p1',
      { title: 'Retraite', description: 'Week-end', startsAt: '2026-11-01T18:00:00.000Z' },
      'u1',
    );
    expect(prisma.activity.create).toHaveBeenCalledWith({
      data: {
        title: 'Retraite',
        description: 'Week-end',
        startsAt: new Date('2026-11-01T18:00:00.000Z'),
        parishId: 'p1',
        createdById: 'u1',
      },
    });
  });

  it('ne supprime que dans la paroisse visée, sinon 404', async () => {
    prisma.activity.deleteMany.mockResolvedValueOnce({ count: 1 });
    await expect(service.remove('p1', 'x1')).resolves.toEqual({ deleted: true });
    expect(prisma.activity.deleteMany).toHaveBeenCalledWith({
      where: { id: 'x1', parishId: 'p1' },
    });

    prisma.activity.deleteMany.mockResolvedValueOnce({ count: 0 });
    await expect(service.remove('p1', 'x2')).rejects.toBeInstanceOf(NotFoundException);
  });
});
