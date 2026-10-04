import { randomBytes } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  AddSheetStepDto,
  ChangeSheetTemplateDto,
  CreateSheetDto,
  ReorderSheetStepsDto,
  SheetView,
  TemplateChangeReport,
  UpdateCelebrationStepDto,
} from '@churchy/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { assertNotPast } from './celebration.rules';
import { SHEET_INCLUDE, isStepFilled, toSheetView } from './sheet.mapper';
import { ERR } from '@churchy/shared';

const FREE_KEY_PREFIX = 'free-';

type Tx = Prisma.TransactionClient;

/**
 * Feuille de préparation d'une date : créée à la demande depuis un modèle (par défaut celui de la série)
 * ou à la volée, puis modifiable librement jusqu'au début de la date.
 */
@Injectable()
export class SheetsService {
  private readonly logger = new Logger(SheetsService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  /** Charge la feuille et son contexte ; refuse toute modification d'une date passée ou annulée. */
  private async loadEditable(sheetId: string, opts: { allowCancelled?: boolean } = {}) {
    const sheet = await this.prisma.preparationSheet.findUnique({
      where: { id: sheetId },
      include: { occurrence: { include: { celebration: { select: { title: true } } } } },
    });
    if (!sheet) throw new NotFoundException(ERR.sheetNotFound);
    assertNotPast(sheet.occurrence.startsAt, new Date());
    if (!opts.allowCancelled && sheet.occurrence.status === 'CANCELLED') {
      throw new ConflictException(ERR.occurrenceCancelled);
    }
    return sheet;
  }

  async findById(sheetId: string): Promise<SheetView> {
    const sheet = await this.prisma.preparationSheet.findUnique({
      where: { id: sheetId },
      include: SHEET_INCLUDE,
    });
    if (!sheet) throw new NotFoundException(ERR.sheetNotFound);
    return toSheetView(sheet);
  }

  private async assertTemplate(parishId: string, templateId: string) {
    const template = await this.prisma.celebrationTemplate.findUnique({
      where: { id: templateId },
      include: { steps: { orderBy: { order: 'asc' } } },
    });
    if (!template || template.parishId !== parishId) {
      throw new NotFoundException(ERR.templateNotFound);
    }
    return template;
  }

  /**
   * Crée la feuille d'une date. `templateId` absent = modèle par défaut de la série ; `null` = feuille vide.
   * Si la feuille existe déjà, elle est renvoyée telle quelle (la création est idempotente).
   */
  async createForOccurrence(occurrenceId: string, dto: CreateSheetDto): Promise<SheetView> {
    const occurrence = await this.prisma.celebrationOccurrence.findUnique({
      where: { id: occurrenceId },
      include: { sheet: true, celebration: { select: { defaultTemplateId: true } } },
    });
    if (!occurrence) throw new NotFoundException(ERR.occurrenceNotFound);
    if (occurrence.sheet) {
      if (dto.templateId !== undefined) {
        throw new ConflictException(ERR.sheetAlreadyExists);
      }
      return this.findById(occurrence.sheet.id);
    }
    assertNotPast(occurrence.startsAt, new Date());
    if (occurrence.status === 'CANCELLED') throw new ConflictException(ERR.occurrenceCancelled);

    const templateId =
      dto.templateId === undefined ? occurrence.celebration.defaultTemplateId : dto.templateId;
    const template = templateId ? await this.assertTemplate(occurrence.parishId, templateId) : null;

    try {
      const sheet = await this.prisma.preparationSheet.create({
        data: {
          occurrenceId,
          templateId: template?.id ?? null,
          steps: {
            create: (template?.steps ?? []).map((step) => ({
              templateStepId: step.id,
              key: step.key,
              title: step.title,
              order: step.order,
            })),
          },
        },
        include: SHEET_INCLUDE,
      });
      return toSheetView(sheet);
    } catch (err) {
      // Deux ouvertures simultanées de la même date : la seconde récupère la feuille de la première.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const existing = await this.prisma.preparationSheet.findUniqueOrThrow({
          where: { occurrenceId },
        });
        return this.findById(existing.id);
      }
      throw err;
    }
  }

  /**
   * Change le modèle d'une feuille. Les étapes sont rapprochées par `key` : le contenu déjà placé est
   * conservé. Une étape remplie sans équivalent devient une étape libre (rien n'est perdu en silence) ;
   * une étape vide sans équivalent est retirée. Passer à `null` détache la feuille de tout modèle.
   */
  async changeTemplate(
    sheetId: string,
    dto: ChangeSheetTemplateDto,
  ): Promise<{ applied: boolean; report: TemplateChangeReport; sheet: SheetView }> {
    const sheet = await this.loadEditable(sheetId);
    const template = dto.templateId
      ? await this.assertTemplate(sheet.occurrence.parishId, dto.templateId)
      : null;
    const current = await this.prisma.celebrationStep.findMany({
      where: { sheetId },
      orderBy: { order: 'asc' },
    });

    const byKey = new Map(current.map((s) => [s.key, s]));
    const templateKeys = new Set((template?.steps ?? []).map((s) => s.key));
    const ref = (s: { key: string; title: string }) => ({ key: s.key, title: s.title });

    const report: TemplateChangeReport = { kept: [], added: [], removed: [], keptAsFree: [] };
    for (const step of template?.steps ?? []) {
      (byKey.has(step.key) ? report.kept : report.added).push(ref(step));
    }
    // Étapes libres (ajoutées à la main) : toujours conservées. Étapes issues de l'ancien modèle sans
    // équivalent : conservées si elles contiennent quelque chose, sinon retirées.
    const orphans = current.filter((s) => !templateKeys.has(s.key));
    for (const step of orphans) {
      if (step.templateStepId === null || isStepFilled(step) || template === null) {
        if (step.templateStepId !== null) report.keptAsFree.push(ref(step));
      } else {
        report.removed.push(ref(step));
      }
    }

    if (dto.dryRun) {
      return { applied: false, report, sheet: await this.findById(sheetId) };
    }

    await this.prisma.$transaction(async (tx: Tx) => {
      const removedKeys = new Set(report.removed.map((s) => s.key));
      if (removedKeys.size > 0) {
        await tx.celebrationStep.deleteMany({ where: { sheetId, key: { in: [...removedKeys] } } });
      }
      let order = 0;
      for (const step of template?.steps ?? []) {
        order += 1;
        const existing = byKey.get(step.key);
        if (existing) {
          await tx.celebrationStep.update({
            where: { id: existing.id },
            data: { templateStepId: step.id, title: step.title, order },
          });
        } else {
          await tx.celebrationStep.create({
            data: { sheetId, templateStepId: step.id, key: step.key, title: step.title, order },
          });
        }
      }
      // Étapes conservées sans équivalent : à la suite du modèle, dans leur ordre actuel.
      for (const step of orphans.filter((s) => !removedKeys.has(s.key))) {
        order += 1;
        await tx.celebrationStep.update({
          where: { id: step.id },
          data: { templateStepId: null, order },
        });
      }
      await tx.preparationSheet.update({
        where: { id: sheetId },
        data: { templateId: template?.id ?? null },
      });
    });
    return { applied: true, report, sheet: await this.findById(sheetId) };
  }

  async addStep(sheetId: string, dto: AddSheetStepDto): Promise<SheetView> {
    await this.loadEditable(sheetId);
    const last = await this.prisma.celebrationStep.aggregate({
      where: { sheetId },
      _max: { order: true },
    });
    await this.prisma.celebrationStep.create({
      data: {
        sheetId,
        key: `${FREE_KEY_PREFIX}${randomBytes(4).toString('hex')}`,
        title: dto.title,
        order: (last._max.order ?? 0) + 1,
      },
    });
    return this.findById(sheetId);
  }

  private async findStep(sheetId: string, stepId: string) {
    const step = await this.prisma.celebrationStep.findUnique({ where: { id: stepId } });
    // L'étape doit appartenir à la feuille de l'URL (celle dont on a contrôlé l'accès).
    if (!step || step.sheetId !== sheetId) throw new NotFoundException(ERR.stepNotFound);
    return step;
  }

  async updateStep(
    sheetId: string,
    stepId: string,
    dto: UpdateCelebrationStepDto,
  ): Promise<SheetView> {
    const sheet = await this.loadEditable(sheetId);
    await this.findStep(sheetId, stepId);
    if (dto.contentId) {
      const content = await this.prisma.content.findUnique({ where: { id: dto.contentId } });
      if (!content || content.parishId !== sheet.occurrence.parishId) {
        throw new BadRequestException(ERR.contentNotFound);
      }
    }
    await this.prisma.celebrationStep.update({
      where: { id: stepId },
      data: { title: dto.title, contentId: dto.contentId, customText: dto.customText },
    });
    return this.findById(sheetId);
  }

  async removeStep(sheetId: string, stepId: string): Promise<SheetView> {
    await this.loadEditable(sheetId);
    await this.findStep(sheetId, stepId);
    await this.prisma.celebrationStep.delete({ where: { id: stepId } });
    return this.findById(sheetId);
  }

  async reorderSteps(sheetId: string, dto: ReorderSheetStepsDto): Promise<SheetView> {
    await this.loadEditable(sheetId);
    const steps = await this.prisma.celebrationStep.findMany({
      where: { sheetId },
      select: { id: true },
    });
    const known = new Set(steps.map((s) => s.id));
    const given = new Set(dto.stepIds);
    if (
      given.size !== dto.stepIds.length ||
      given.size !== known.size ||
      dto.stepIds.some((id) => !known.has(id))
    ) {
      throw new BadRequestException(ERR.stepsListMismatch);
    }
    await this.prisma.$transaction(
      dto.stepIds.map((id, index) =>
        this.prisma.celebrationStep.update({ where: { id }, data: { order: index + 1 } }),
      ),
    );
    return this.findById(sheetId);
  }

  async publish(sheetId: string): Promise<SheetView> {
    const sheet = await this.loadEditable(sheetId);
    if (sheet.status === 'PUBLISHED') throw new BadRequestException(ERR.sheetAlreadyPublished);
    const published = await this.prisma.preparationSheet.update({
      where: { id: sheetId },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    });
    try {
      await this.notifications.celebrationPublished({
        celebrationId: sheet.occurrence.celebrationId,
        occurrenceId: sheet.occurrenceId,
        parishId: sheet.occurrence.parishId,
        title: sheet.occurrence.celebration.title,
        date: sheet.occurrence.startsAt.toISOString(),
        publishedAt: published.publishedAt!.toISOString(),
      });
    } catch (err) {
      // La publication est déjà enregistrée : l'échec d'enfilage ne doit pas la faire échouer.
      this.logger.error(`Notification non enfilée pour la feuille ${sheetId}`, err as Error);
    }
    return this.findById(sheetId);
  }

  async unpublish(sheetId: string): Promise<SheetView> {
    const sheet = await this.loadEditable(sheetId);
    if (sheet.status !== 'PUBLISHED') throw new BadRequestException(ERR.sheetNotPublished);
    await this.prisma.preparationSheet.update({
      where: { id: sheetId },
      data: { status: 'DRAFT', publishedAt: null },
    });
    return this.findById(sheetId);
  }
}
