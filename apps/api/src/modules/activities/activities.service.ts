import { Injectable, NotFoundException } from '@nestjs/common';
import { ContentVisibility, type CreateActivityDto } from '@churchy/shared';
import type { ParishRoleValue } from '../../common/decorators/parish-role.decorator';
import { canSeeMembersContent } from '../../common/visibility';
import { sanitizeRichText } from '../../common/rich-text';
import { PrismaService } from '../../prisma/prisma.service';
import { ERR } from '@churchy/shared';

@Injectable()
export class ActivitiesService {
  constructor(private prisma: PrismaService) {}

  create(parishId: string, dto: CreateActivityDto, userId: string) {
    return this.prisma.activity.create({
      data: {
        ...dto,
        description: sanitizeRichText(dto.description),
        startsAt: new Date(dto.startsAt),
        parishId,
        createdById: userId,
      },
    });
  }

  /** Un fidèle ne reçoit que le public ; un paroissien (ou plus) reçoit aussi « Paroissiens seulement ». */
  findByParish(parishId: string, role: ParishRoleValue | undefined) {
    return this.prisma.activity.findMany({
      where: {
        parishId,
        ...(canSeeMembersContent(role) ? {} : { visibility: ContentVisibility.PUBLIC }),
      },
      orderBy: { startsAt: 'desc' },
    });
  }

  /** Le couple (id, parishId) garantit qu'on ne supprime pas l'activité d'une autre paroisse. */
  async remove(parishId: string, id: string) {
    const { count } = await this.prisma.activity.deleteMany({ where: { id, parishId } });
    if (count === 0) throw new NotFoundException(ERR.activityNotFound);
    return { deleted: true };
  }
}
