import { Injectable, NotFoundException } from '@nestjs/common';
import type { CreateAnnouncementDto } from '@churchy/shared';
import { sanitizeRichText } from '../../common/rich-text';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AnnouncementsService {
  constructor(private prisma: PrismaService) {}

  create(parishId: string, dto: CreateAnnouncementDto, userId: string) {
    return this.prisma.announcement.create({
      data: { ...dto, body: sanitizeRichText(dto.body), parishId, createdById: userId },
    });
  }

  findByParish(parishId: string) {
    return this.prisma.announcement.findMany({
      where: { parishId },
      orderBy: { publishedAt: 'desc' },
    });
  }

  /** Le couple (id, parishId) garantit qu'on ne supprime pas l'annonce d'une autre paroisse. */
  async remove(parishId: string, id: string) {
    const { count } = await this.prisma.announcement.deleteMany({ where: { id, parishId } });
    if (count === 0) throw new NotFoundException('Annonce introuvable');
    return { deleted: true };
  }
}
