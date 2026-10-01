import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import type {
  CreateCelebrationDto,
  SetCelebrationAnnouncedDto,
  UpdateCelebrationStepDto,
} from '@churchy/shared';

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
    // Un modèle d'une autre paroisse ne doit pas être utilisable.
    if (!template || template.parishId !== parishId) {
      throw new NotFoundException('Modèle introuvable');
    }

    return this.prisma.celebration.create({
      data: {
        parishId,
        templateId: dto.templateId,
        title: dto.title,
        date: new Date(dto.date),
        location: dto.location,
        announced: dto.announced ?? false,
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

  async updateStep(celebrationId: string, stepId: string, dto: UpdateCelebrationStepDto) {
    const step = await this.prisma.celebrationStep.findUnique({
      where: { id: stepId },
      include: { celebration: { select: { parishId: true } } },
    });
    // L'étape doit appartenir à la célébration de l'URL (celle dont on a contrôlé l'accès).
    if (!step || step.celebrationId !== celebrationId) {
      throw new NotFoundException('Étape introuvable');
    }
    if (dto.contentId) {
      const content = await this.prisma.content.findUnique({ where: { id: dto.contentId } });
      if (!content || content.parishId !== step.celebration.parishId) {
        throw new BadRequestException('Contenu introuvable');
      }
    }
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

  /** Rend la célébration visible du public (« feuille en préparation ») avant la publication de la feuille. */
  async setAnnounced(id: string, dto: SetCelebrationAnnouncedDto) {
    await this.findById(id);
    return this.prisma.celebration.update({ where: { id }, data: { announced: dto.announced } });
  }

  async archive(id: string) {
    return this.prisma.celebration.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });
  }
}
