import { Injectable, NotFoundException } from '@nestjs/common';
import type { CreateActivityDto } from '@churchy/shared';
import { sanitizeRichText } from '../../common/rich-text';
import { PrismaService } from '../../prisma/prisma.service';

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

  findByParish(parishId: string) {
    return this.prisma.activity.findMany({ where: { parishId }, orderBy: { startsAt: 'desc' } });
  }

  /** Le couple (id, parishId) garantit qu'on ne supprime pas l'activité d'une autre paroisse. */
  async remove(parishId: string, id: string) {
    const { count } = await this.prisma.activity.deleteMany({ where: { id, parishId } });
    if (count === 0) throw new NotFoundException('Activité introuvable');
    return { deleted: true };
  }
}
