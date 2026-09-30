import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateCelebrationTemplateDto, CreateTemplateStepDto } from '@churchy/shared';

@Injectable()
export class CelebrationTemplatesService {
  constructor(private prisma: PrismaService) {}

  async create(parishId: string, dto: CreateCelebrationTemplateDto) {
    return this.prisma.celebrationTemplate.create({
      data: { ...dto, parishId },
    });
  }

  async findByParish(parishId: string) {
    return this.prisma.celebrationTemplate.findMany({
      where: { parishId },
      include: { steps: { orderBy: { order: 'asc' } } },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    const template = await this.prisma.celebrationTemplate.findUnique({
      where: { id },
      include: { steps: { orderBy: { order: 'asc' } } },
    });
    if (!template) throw new NotFoundException('Modèle introuvable');
    return template;
  }

  async addStep(templateId: string, dto: CreateTemplateStepDto) {
    await this.findById(templateId);
    return this.prisma.celebrationTemplateStep.create({
      data: { ...dto, templateId },
    });
  }

  async removeStep(stepId: string) {
    await this.prisma.celebrationTemplateStep.delete({ where: { id: stepId } });
  }
}
