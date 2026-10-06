import { NotFoundException } from '@nestjs/common';
import { ContentVisibility, ParishStatus } from '@churchy/shared';
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
      {
        title: 'Retraite',
        description: 'Week-end',
        startsAt: '2026-11-01T18:00:00.000Z',
        visibility: ContentVisibility.MEMBERS,
      },
      'u1',
    );
    expect(prisma.activity.create).toHaveBeenCalledWith({
      data: {
        title: 'Retraite',
        description: '<p>Week-end</p>',
        startsAt: new Date('2026-11-01T18:00:00.000Z'),
        visibility: 'MEMBERS',
        parishId: 'p1',
        createdById: 'u1',
      },
    });
  });

  it('un fidèle ne reçoit que le public, un paroissien reçoit tout', async () => {
    await service.findByParish('p1', { status: ParishStatus.FAITHFUL, duties: [] });
    expect(prisma.activity.findMany).toHaveBeenLastCalledWith({
      where: { parishId: 'p1', visibility: 'PUBLIC' },
      orderBy: { startsAt: 'desc' },
    });
    await service.findByParish('p1', { status: ParishStatus.PARISHIONER, duties: [] });
    expect(prisma.activity.findMany).toHaveBeenLastCalledWith({
      where: { parishId: 'p1' },
      orderBy: { startsAt: 'desc' },
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
