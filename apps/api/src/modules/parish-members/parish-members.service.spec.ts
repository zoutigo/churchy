import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { MAX_FAITHFUL_PARISHES, ParishDuty, ParishStatus } from '@churchy/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { ParishMembersService } from './parish-members.service';

type Fn = jest.Mock;

const row = (status: ParishStatus, duties: ParishDuty[] = [], extra = {}) => ({
  id: 'm1',
  userId: 'u1',
  parishId: 'p1',
  status,
  duties,
  createdAt: new Date('2026-10-01T10:00:00Z'),
  user: { firstName: 'Anne', lastName: 'Biya' },
  ...extra,
});

describe('ParishMembersService', () => {
  let member: { findUnique: Fn; count: Fn; upsert: Fn; update: Fn; delete: Fn; findMany: Fn };
  let prisma: { parish: { findUnique: Fn }; parishMember: typeof member; $transaction: Fn };
  let service: ParishMembersService;

  beforeEach(() => {
    member = {
      findUnique: jest.fn(),
      count: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    };
    prisma = {
      parish: { findUnique: jest.fn().mockResolvedValue({ id: 'p1' }) },
      parishMember: member,
      $transaction: jest.fn((fn: (tx: unknown) => unknown) => fn({ parishMember: member })),
    };
    service = new ParishMembersService(prisma as unknown as PrismaService);
  });

  describe('follow', () => {
    it('crée un fidèle (sans validation)', async () => {
      member.findUnique.mockResolvedValue(null);
      member.count.mockResolvedValue(0);
      member.upsert.mockResolvedValue(row(ParishStatus.FAITHFUL));
      await expect(service.follow('p1', 'u1')).resolves.toEqual({ status: 'FAITHFUL', duties: [] });
      expect(member.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: { userId: 'u1', parishId: 'p1', status: ParishStatus.FAITHFUL },
        }),
      );
    });

    it('est idempotent : un paroissien qui suit à nouveau reste paroissien', async () => {
      member.findUnique.mockResolvedValue(row(ParishStatus.PARISHIONER, [ParishDuty.READER]));
      await expect(service.follow('p1', 'u1')).resolves.toEqual({
        status: 'PARISHIONER',
        duties: ['READER'],
      });
      expect(member.upsert).not.toHaveBeenCalled();
    });

    it('404 si la paroisse n’existe pas', async () => {
      prisma.parish.findUnique.mockResolvedValue(null);
      await expect(service.follow('nope', 'u1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it(`refuse au-delà de ${MAX_FAITHFUL_PARISHES} paroisses`, async () => {
      member.findUnique.mockResolvedValue(null);
      member.count.mockResolvedValue(MAX_FAITHFUL_PARISHES);
      await expect(service.follow('p1', 'u1')).rejects.toBeInstanceOf(ConflictException);
      expect(member.upsert).not.toHaveBeenCalled();
    });
  });

  describe('leave (un cran en dessous)', () => {
    it('un fidèle quitte la paroisse', async () => {
      member.findUnique.mockResolvedValue(row(ParishStatus.FAITHFUL));
      await expect(service.leave('p1', 'u1')).resolves.toBeNull();
      expect(member.delete).toHaveBeenCalledWith({ where: { id: 'm1' } });
    });

    it('un paroissien redevient fidèle et perd ses responsabilités', async () => {
      member.findUnique.mockResolvedValue(row(ParishStatus.PARISHIONER, [ParishDuty.PREPARER]));
      member.update.mockResolvedValue(row(ParishStatus.FAITHFUL));
      await expect(service.leave('p1', 'u1')).resolves.toEqual({ status: 'FAITHFUL', duties: [] });
      expect(member.update).toHaveBeenCalledWith({
        where: { id: 'm1' },
        data: { status: ParishStatus.FAITHFUL, duties: [] },
      });
    });

    it('le dernier administrateur ne peut pas partir', async () => {
      member.findUnique.mockResolvedValue(row(ParishStatus.PARISH_ADMIN));
      member.count.mockResolvedValue(0);
      await expect(service.leave('p1', 'u1')).rejects.toBeInstanceOf(ConflictException);
      expect(member.update).not.toHaveBeenCalled();
    });

    it('un administrateur parmi d’autres peut redevenir fidèle', async () => {
      member.findUnique.mockResolvedValue(row(ParishStatus.PARISH_ADMIN));
      member.count.mockResolvedValue(1);
      member.update.mockResolvedValue(row(ParishStatus.FAITHFUL));
      await expect(service.leave('p1', 'u1')).resolves.toEqual({ status: 'FAITHFUL', duties: [] });
    });

    it('404 si on ne suit pas la paroisse', async () => {
      member.findUnique.mockResolvedValue(null);
      await expect(service.leave('p1', 'u1')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('update', () => {
    it('promeut un fidèle en paroissien', async () => {
      member.findUnique.mockResolvedValue(row(ParishStatus.FAITHFUL));
      member.update.mockResolvedValue(row(ParishStatus.PARISHIONER));
      const res = await service.update('p1', 'u1', { status: ParishStatus.PARISHIONER });
      expect(res).toMatchObject({ firstName: 'Anne', status: 'PARISHIONER', duties: [] });
    });

    it('attribue des responsabilités à un paroissien', async () => {
      member.findUnique.mockResolvedValue(row(ParishStatus.PARISHIONER));
      member.update.mockResolvedValue(row(ParishStatus.PARISHIONER, [ParishDuty.READER]));
      await service.update('p1', 'u1', { duties: [ParishDuty.READER] });
      expect(member.update).toHaveBeenCalledWith({
        where: { id: 'm1' },
        data: { status: ParishStatus.PARISHIONER, duties: ['READER'] },
      });
    });

    it('refuse une responsabilité à un fidèle', async () => {
      member.findUnique.mockResolvedValue(row(ParishStatus.FAITHFUL));
      await expect(
        service.update('p1', 'u1', { duties: [ParishDuty.READER] }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(member.update).not.toHaveBeenCalled();
    });

    it('rétrograder en fidèle efface les responsabilités', async () => {
      member.findUnique.mockResolvedValue(row(ParishStatus.PARISHIONER, [ParishDuty.READER]));
      member.update.mockResolvedValue(row(ParishStatus.FAITHFUL));
      await service.update('p1', 'u1', { status: ParishStatus.FAITHFUL });
      expect(member.update).toHaveBeenCalledWith({
        where: { id: 'm1' },
        data: { status: ParishStatus.FAITHFUL, duties: [] },
      });
    });

    it('ne rétrograde pas le dernier administrateur', async () => {
      member.findUnique.mockResolvedValue(row(ParishStatus.PARISH_ADMIN));
      member.count.mockResolvedValue(0);
      await expect(
        service.update('p1', 'u1', { status: ParishStatus.PARISHIONER }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('404 si le membre est inconnu', async () => {
      member.findUnique.mockResolvedValue(null);
      await expect(
        service.update('p1', 'x', { status: ParishStatus.PARISHIONER }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('remove', () => {
    it('retire un membre', async () => {
      member.findUnique.mockResolvedValue(row(ParishStatus.PARISHIONER));
      await service.remove('p1', 'u1');
      expect(member.delete).toHaveBeenCalledWith({ where: { id: 'm1' } });
    });

    it('ne retire pas le dernier administrateur', async () => {
      member.findUnique.mockResolvedValue(row(ParishStatus.PARISH_ADMIN));
      member.count.mockResolvedValue(0);
      await expect(service.remove('p1', 'u1')).rejects.toBeInstanceOf(ConflictException);
      expect(member.delete).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('ne renvoie ni email ni téléphone', async () => {
      member.count.mockResolvedValue(1);
      member.findMany.mockResolvedValue([
        {
          userId: 'u1',
          status: ParishStatus.FAITHFUL,
          duties: [],
          createdAt: new Date('2026-10-01T10:00:00Z'),
          user: { firstName: 'Anne', lastName: 'Biya' },
        },
      ]);
      const page = await service.list('p1', { page: 1 });
      expect(page.items).toEqual([
        {
          userId: 'u1',
          firstName: 'Anne',
          lastName: 'Biya',
          status: 'FAITHFUL',
          duties: [],
          joinedAt: '2026-10-01T10:00:00.000Z',
        },
      ]);
      const select = member.findMany.mock.calls[0][0].select;
      expect(JSON.stringify(select)).not.toMatch(/email|phone/i);
    });
  });
});
