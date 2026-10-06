import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  ERR,
  MAX_FAITHFUL_PARISHES,
  ParishDuty,
  ParishStatus,
  type ParishMemberDto,
  type ParishMembersPageDto,
  type ParishMembershipDto,
  type UpdateMemberDto,
} from '@churchy/shared';
import { PrismaService } from '../../prisma/prisma.service';

export const PARISH_MEMBERS_PAGE_SIZE = 30;

const serializable = { isolationLevel: Prisma.TransactionIsolationLevel.Serializable };

@Injectable()
export class ParishMembersService {
  constructor(private prisma: PrismaService) {}

  /** L'appartenance de l'appelant à la paroisse, ou `null` (ni fidèle ni membre). */
  async membership(parishId: string, userId: string): Promise<ParishMembershipDto | null> {
    const m = await this.prisma.parishMember.findUnique({
      where: { userId_parishId: { userId, parishId } },
    });
    return m && { status: m.status as ParishStatus, duties: m.duties as ParishDuty[] };
  }

  /**
   * Devenir fidèle : sans validation, idempotent (déjà fidèle ou plus : rien ne change). Le nom et le
   * prénom sont ceux du compte. Plafond de paroisses suivies, contre les abus.
   */
  async follow(parishId: string, userId: string): Promise<ParishMembershipDto> {
    const parish = await this.prisma.parish.findUnique({
      where: { id: parishId },
      select: { id: true },
    });
    if (!parish) throw new NotFoundException(ERR.parishNotFound);
    const existing = await this.membership(parishId, userId);
    if (existing) return existing;
    const count = await this.prisma.parishMember.count({ where: { userId } });
    if (count >= MAX_FAITHFUL_PARISHES) throw new ConflictException(ERR.parishFollowLimit);
    const created = await this.prisma.parishMember.upsert({
      where: { userId_parishId: { userId, parishId } },
      create: { userId, parishId, status: ParishStatus.FAITHFUL },
      update: {},
    });
    return { status: created.status as ParishStatus, duties: created.duties as ParishDuty[] };
  }

  /**
   * Se retirer, d'un cran : un paroissien (ou un administrateur) redevient fidèle, un fidèle quitte la
   * paroisse. Le dernier administrateur ne peut pas partir.
   */
  async leave(parishId: string, userId: string): Promise<ParishMembershipDto | null> {
    return this.prisma.$transaction(async (tx) => {
      const member = await tx.parishMember.findUnique({
        where: { userId_parishId: { userId, parishId } },
      });
      if (!member) throw new NotFoundException(ERR.notFollowing);
      if (member.status === ParishStatus.FAITHFUL) {
        await tx.parishMember.delete({ where: { id: member.id } });
        return null;
      }
      if (member.status === ParishStatus.PARISH_ADMIN) await this.assertNotLastAdmin(tx, member);
      const updated = await tx.parishMember.update({
        where: { id: member.id },
        data: { status: ParishStatus.FAITHFUL, duties: [] },
      });
      return { status: updated.status as ParishStatus, duties: updated.duties as ParishDuty[] };
    }, serializable);
  }

  /**
   * Liste pour l'administrateur : nom, prénom, date, statut, responsabilités. Jamais d'email ni de
   * téléphone (les fidèles ne l'ont pas donné pour ça).
   */
  async list(
    parishId: string,
    query: { q?: string; status?: ParishStatus; page: number },
  ): Promise<ParishMembersPageDto> {
    const words = (query.q ?? '').split(/\s+/).filter(Boolean);
    const where: Prisma.ParishMemberWhereInput = {
      parishId,
      ...(query.status ? { status: query.status } : {}),
      AND: words.map((w) => ({
        user: {
          OR: [
            { firstName: { contains: w, mode: 'insensitive' } },
            { lastName: { contains: w, mode: 'insensitive' } },
          ],
        },
      })),
    };
    const [total, rows] = await Promise.all([
      this.prisma.parishMember.count({ where }),
      this.prisma.parishMember.findMany({
        where,
        orderBy: [{ user: { lastName: 'asc' } }, { user: { firstName: 'asc' } }, { id: 'asc' }],
        skip: (query.page - 1) * PARISH_MEMBERS_PAGE_SIZE,
        take: PARISH_MEMBERS_PAGE_SIZE,
        select: {
          userId: true,
          status: true,
          duties: true,
          createdAt: true,
          user: { select: { firstName: true, lastName: true } },
        },
      }),
    ]);
    return {
      items: rows.map((m) => ({
        userId: m.userId,
        firstName: m.user.firstName,
        lastName: m.user.lastName,
        status: m.status as ParishStatus,
        duties: m.duties as ParishDuty[],
        joinedAt: m.createdAt.toISOString(),
      })),
      total,
      page: query.page,
      pageSize: PARISH_MEMBERS_PAGE_SIZE,
    };
  }

  /** Promotion, rétrogradation, responsabilités : décidées par un administrateur de la paroisse. */
  async update(parishId: string, userId: string, dto: UpdateMemberDto): Promise<ParishMemberDto> {
    return this.prisma.$transaction(async (tx) => {
      const member = await tx.parishMember.findUnique({
        where: { userId_parishId: { userId, parishId } },
        include: { user: { select: { firstName: true, lastName: true } } },
      });
      if (!member) throw new NotFoundException(ERR.memberNotFound);
      const status = (dto.status ?? member.status) as ParishStatus;
      // Une responsabilité ne se donne qu'à un paroissien : changer de statut efface celles qui restent.
      let duties = (dto.duties ?? member.duties) as ParishDuty[];
      if (status !== ParishStatus.PARISHIONER) {
        if (dto.duties?.length) throw new BadRequestException(ERR.dutyNeedsParishioner);
        duties = [];
      }
      if (member.status === ParishStatus.PARISH_ADMIN && status !== ParishStatus.PARISH_ADMIN) {
        await this.assertNotLastAdmin(tx, member);
      }
      const updated = await tx.parishMember.update({
        where: { id: member.id },
        data: { status, duties },
      });
      return {
        userId,
        firstName: member.user.firstName,
        lastName: member.user.lastName,
        status: updated.status as ParishStatus,
        duties: updated.duties as ParishDuty[],
        joinedAt: updated.createdAt.toISOString(),
      };
    }, serializable);
  }

  /** Retirer quelqu'un de la paroisse : sans condition, sauf le dernier administrateur. */
  async remove(parishId: string, userId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const member = await tx.parishMember.findUnique({
        where: { userId_parishId: { userId, parishId } },
      });
      if (!member) throw new NotFoundException(ERR.memberNotFound);
      if (member.status === ParishStatus.PARISH_ADMIN) await this.assertNotLastAdmin(tx, member);
      await tx.parishMember.delete({ where: { id: member.id } });
    }, serializable);
  }

  /** Une paroisse garde toujours au moins un administrateur. */
  private async assertNotLastAdmin(
    tx: Prisma.TransactionClient,
    member: { parishId: string; id: string },
  ) {
    const others = await tx.parishMember.count({
      where: {
        parishId: member.parishId,
        status: ParishStatus.PARISH_ADMIN,
        id: { not: member.id },
      },
    });
    if (others === 0) throw new ConflictException(ERR.parishLastAdmin);
  }
}
