import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AnnouncementsService } from './announcements.service';

describe('AnnouncementsService', () => {
  let prisma: { announcement: { create: jest.Mock; findMany: jest.Mock; deleteMany: jest.Mock } };
  let service: AnnouncementsService;

  beforeEach(() => {
    prisma = {
      announcement: { create: jest.fn(), findMany: jest.fn(), deleteMany: jest.fn() },
    };
    service = new AnnouncementsService(prisma as unknown as PrismaService);
  });

  it('crée l’annonce dans la paroisse de l’URL, avec son auteur', async () => {
    await service.create('p1', { title: 'Horaires', body: 'Texte' }, 'u1');
    expect(prisma.announcement.create).toHaveBeenCalledWith({
      data: { title: 'Horaires', body: '<p>Texte</p>', parishId: 'p1', createdById: 'u1' },
    });
  });

  it('liste les plus récentes d’abord', async () => {
    await service.findByParish('p1');
    expect(prisma.announcement.findMany).toHaveBeenCalledWith({
      where: { parishId: 'p1' },
      orderBy: { publishedAt: 'desc' },
    });
  });

  it('ne supprime que dans la paroisse visée (isolation)', async () => {
    prisma.announcement.deleteMany.mockResolvedValue({ count: 1 });
    await expect(service.remove('p1', 'a1')).resolves.toEqual({ deleted: true });
    expect(prisma.announcement.deleteMany).toHaveBeenCalledWith({
      where: { id: 'a1', parishId: 'p1' },
    });
  });

  it('404 si l’annonce n’appartient pas à cette paroisse', async () => {
    prisma.announcement.deleteMany.mockResolvedValue({ count: 0 });
    await expect(service.remove('p1', 'a-autre')).rejects.toBeInstanceOf(NotFoundException);
  });
});
