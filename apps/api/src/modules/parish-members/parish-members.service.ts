import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { InviteMemberDto } from '@churchy/shared';

@Injectable()
export class ParishMembersService {
  constructor(private prisma: PrismaService) {}

  async invite(parishId: string, dto: InviteMemberDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new NotFoundException('Utilisateur introuvable avec cet email');

    const existing = await this.prisma.parishMember.findUnique({
      where: { userId_parishId: { userId: user.id, parishId } },
    });
    if (existing) throw new ConflictException('Cet utilisateur est déjà membre');

    return this.prisma.parishMember.create({
      data: { userId: user.id, parishId, role: dto.role },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
    });
  }

  async findByParish(parishId: string) {
    return this.prisma.parishMember.findMany({
      where: { parishId },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async remove(parishId: string, userId: string) {
    const member = await this.prisma.parishMember.findUnique({
      where: { userId_parishId: { userId, parishId } },
    });
    if (!member) throw new NotFoundException('Membre introuvable');
    await this.prisma.parishMember.delete({
      where: { userId_parishId: { userId, parishId } },
    });
  }
}
