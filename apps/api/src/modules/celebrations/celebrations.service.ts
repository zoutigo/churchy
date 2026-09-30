import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { CreateCelebrationDto, UpdateCelebrationStepDto } from '@churchy/shared';

@Injectable()
export class CelebrationsService {
  private readonly logger = new Logger(CelebrationsService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async create(parishId: string, dto: CreateCelebrationDto, userId: string) {
    const template = await this.prisma.celebrationTemplate.findUnique({
      where: { id: dto.templateId },
      include: { steps: { orderBy: { order: 'asc' } } },
    });
    if (!template) throw new NotFoundException('Modèle introuvable');

    return this.prisma.celebration.create({
      data: {
        parishId,
        templateId: dto.templateId,
        title: dto.title,
        date: new Date(dto.date),
        location: dto.location,
        createdById: userId,
        steps: {
          create: template.steps.map((step) => ({
            templateStepId: step.id,
            title: step.title,
            order: step.order,
          })),
        },
      },
      include: { steps: { orderBy: { order: 'asc' } } },
    });
  }

  async findByParish(parishId: string) {
    return this.prisma.celebration.findMany({
      where: { parishId },
      include: { template: { select: { name: true, type: true } } },
      orderBy: { date: 'desc' },
    });
  }

  async findById(id: string) {
    const celebration = await this.prisma.celebration.findUnique({
      where: { id },
      include: {
        steps: {
          include: { content: true },
          orderBy: { order: 'asc' },
        },
        template: true,
      },
    });
    if (!celebration) throw new NotFoundException('Célébration introuvable');
    return celebration;
  }

  async updateStep(stepId: string, dto: UpdateCelebrationStepDto) {
    return this.prisma.celebrationStep.update({
      where: { id: stepId },
      data: dto,
    });
  }

  async publish(id: string) {
    const celebration = await this.findById(id);
    if (celebration.status === 'PUBLISHED') {
      throw new BadRequestException('Célébration déjà publiée');
    }
    const published = await this.prisma.celebration.update({
      where: { id },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    });
    try {
      await this.notifications.celebrationPublished({
        celebrationId: published.id,
        parishId: published.parishId,
        title: published.title,
        date: published.date.toISOString(),
        publishedAt: published.publishedAt!.toISOString(),
      });
    } catch (err) {
      // La publication est déjà enregistrée : l'échec d'enfilage ne doit pas la faire échouer.
      this.logger.error(`Notification non enfilée pour la célébration ${id}`, err as Error);
    }
    return published;
  }

  async archive(id: string) {
    return this.prisma.celebration.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });
  }

  async findPublishedByParishSlug(slug: string) {
    const parish = await this.prisma.parish.findUnique({ where: { slug } });
    if (!parish) throw new NotFoundException('Paroisse introuvable');
    return this.prisma.celebration.findMany({
      where: { parishId: parish.id, status: 'PUBLISHED' },
      include: { template: { select: { name: true, type: true } } },
      orderBy: { date: 'desc' },
    });
  }

  async findPublishedById(id: string) {
    const celebration = await this.prisma.celebration.findUnique({
      where: { id, status: 'PUBLISHED' },
      include: {
        steps: { include: { content: true }, orderBy: { order: 'asc' } },
        template: true,
        parish: { select: { name: true, slug: true, city: true } },
      },
    });
    if (!celebration) throw new NotFoundException('Célébration introuvable');
    return celebration;
  }
}
