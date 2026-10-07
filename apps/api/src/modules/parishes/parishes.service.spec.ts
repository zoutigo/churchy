import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ParishesService } from './parishes.service';

describe('ParishesService', () => {
  let prisma: {
    parish: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock };
    parishMember: { create: jest.Mock };
  };
  let service: ParishesService;
  const dto = { name: 'Saint Pierre', city: 'Lyon', country: 'France' };

  beforeEach(() => {
    prisma = {
      parish: {
        findUnique: jest.fn(),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'p1', ...data })),
        update: jest.fn().mockResolvedValue({ id: 'p1' }),
      },
      parishMember: { create: jest.fn() },
    };
    service = new ParishesService(prisma as unknown as PrismaService);
  });

  describe('create', () => {
    it('génère le slug à partir du nom et fait du créateur un PARISH_ADMIN', async () => {
      prisma.parish.findUnique.mockResolvedValue(null);
      const parish = await service.create(dto, 'u1');
      expect(parish.slug).toBe('saint-pierre');
      expect(prisma.parishMember.create).toHaveBeenCalledWith({
        data: { userId: 'u1', parishId: 'p1', status: 'PARISH_ADMIN' },
      });
    });

    it('non-régression : deux paroisses de même nom ne provoquent plus de collision de slug', async () => {
      prisma.parish.findUnique.mockResolvedValue({ id: 'existante' });
      const parish = await service.create(dto, 'u1');
      expect(parish.slug).toMatch(/^saint-pierre-[0-9a-f]{6}$/);
    });

    it('le fuseau horaire par défaut suit le pays', async () => {
      prisma.parish.findUnique.mockResolvedValue(null);
      expect((await service.create(dto, 'u1')).timezone).toBe('Europe/Paris');
      expect((await service.create({ ...dto, country: 'Cameroun' }, 'u1')).timezone).toBe(
        'Africa/Douala',
      );
    });

    it('un fuseau choisi explicitement l’emporte sur celui du pays', async () => {
      prisma.parish.findUnique.mockResolvedValue(null);
      const parish = await service.create({ ...dto, timezone: 'Indian/Reunion' }, 'u1');
      expect(parish.timezone).toBe('Indian/Reunion');
    });

    it('retombe sur un slug par défaut si le nom ne contient aucun caractère exploitable', async () => {
      prisma.parish.findUnique.mockResolvedValue(null);
      const parish = await service.create({ ...dto, name: '✦✦' }, 'u1');
      expect(parish.slug).toBe('paroisse');
    });
  });

  describe('update', () => {
    it('met à jour les champs fournis', async () => {
      prisma.parish.findUnique.mockResolvedValue({ id: 'p1' });
      await service.update('p1', { address: '2 rue Neuve', phone: null });
      expect(prisma.parish.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { address: '2 rue Neuve', phone: null },
      });
    });

    it('404 si la paroisse n’existe pas', async () => {
      prisma.parish.findUnique.mockResolvedValue(null);
      await expect(service.update('x', { address: 'a' })).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.parish.update).not.toHaveBeenCalled();
    });
  });
});
