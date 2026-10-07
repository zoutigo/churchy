import { Injectable, NotFoundException } from '@nestjs/common';
import { ContentVisibility, type CreateAnnouncementDto } from '@churchy/shared';
import type { ParishRoleValue } from '../../common/decorators/parish-role.decorator';
import { canSeeMembersContent } from '../../common/visibility';
import { sanitizeRichText } from '../../common/rich-text';
import { PrismaService } from '../../prisma/prisma.service';
import { ERR } from '@churchy/shared';

@Injectable()
export class AnnouncementsService {
  constructor(private prisma: PrismaService) {}

  create(parishId: string, dto: CreateAnnouncementDto, userId: string) {
    return this.prisma.announcement.create({
      data: { ...dto, body: sanitizeRichText(dto.body), parishId, createdById: userId },
    });
  }

  /** Un fidèle ne reçoit que le public ; un paroissien (ou plus) reçoit aussi « Paroissiens seulement ». */
  findByParish(parishId: string, role: ParishRoleValue | undefined) {
    return this.prisma.announcement.findMany({
      where: {
        parishId,
        ...(canSeeMembersContent(role) ? {} : { visibility: ContentVisibility.PUBLIC }),
      },
      orderBy: { publishedAt: 'desc' },
    });
  }

  /** Le couple (id, parishId) garantit qu'on ne supprime pas l'annonce d'une autre paroisse. */
  async remove(parishId: string, id: string) {
    const { count } = await this.prisma.announcement.deleteMany({ where: { id, parishId } });
    if (count === 0) throw new NotFoundException(ERR.announcementNotFound);
    return { deleted: true };
  }
}
