import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { sanitizeRichText } from '../../common/rich-text';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateContentDto, UpdateContentDto } from '@churchy/shared';
import { ERR } from '@churchy/shared';

@Injectable()
export class ContentsService {
  constructor(private prisma: PrismaService) {}

  async create(parishId: string, dto: CreateContentDto, userId: string) {
    return this.prisma.content.create({
      data: { ...dto, body: sanitizeRichText(dto.body), parishId, createdById: userId },
    });
  }

  async findByParish(parishId: string) {
    return this.prisma.content.findMany({
      where: { parishId },
      include: { createdBy: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const content = await this.prisma.content.findUnique({
      where: { id },
      include: { createdBy: { select: { id: true, firstName: true, lastName: true } } },
    });
    if (!content) throw new NotFoundException(ERR.contentNotFound);
    return content;
  }

  async update(id: string, dto: UpdateContentDto, userId: string) {
    const content = await this.findById(id);
    if (content.createdById !== userId) {
      throw new ForbiddenException(ERR.creatorOnlyEdit);
    }
    return this.prisma.content.update({
      where: { id },
      data: { ...dto, ...(dto.body !== undefined && { body: sanitizeRichText(dto.body) }) },
    });
  }

  async remove(id: string, userId: string) {
    const content = await this.findById(id);
    if (content.createdById !== userId) {
      throw new ForbiddenException(ERR.creatorOnlyDelete);
    }
    await this.prisma.content.delete({ where: { id } });
  }
}
