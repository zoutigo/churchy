import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  CreateCelebrationTemplateDto,
  CreateTemplateStepDto,
  UpdateCelebrationTemplateDto,
} from '@churchy/shared';
import { uniqueStepKeys } from './step-keys';
import { ERR } from '@churchy/shared';

// Décalage temporaire des ordres : (templateId, order) est unique, on ne peut pas permuter en place.
const ORDER_OFFSET = 10_000;

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
    if (!template) throw new NotFoundException(ERR.templateNotFound);
    return template;
  }

  async addStep(templateId: string, dto: CreateTemplateStepDto) {
    await this.findById(templateId);
    return this.prisma.celebrationTemplateStep.create({
      data: { ...dto, templateId },
    });
  }

  async removeStep(stepId: string) {
    const used = await this.prisma.celebrationStep.count({ where: { templateStepId: stepId } });
    if (used > 0) {
      throw new ConflictException(ERR.stepInUse);
    }
    await this.prisma.celebrationTemplateStep.delete({ where: { id: stepId } });
  }

  /** Modifie le modèle et, si `steps` est fourni, remplace la liste des étapes (ordre = position). */
  async update(id: string, dto: UpdateCelebrationTemplateDto) {
    const current = await this.findById(id);
    const { steps, ...fields } = dto;

    if (steps) {
      const existing = new Map(current.steps.map((s) => [s.id, s]));
      const unknown = steps.find((s) => s.id && !existing.has(s.id));
      if (unknown) throw new BadRequestException(ERR.stepUnknownForTemplate);
      const ids = steps.filter((s) => s.id).map((s) => s.id);
      if (new Set(ids).size !== ids.length) throw new BadRequestException(ERR.stepDuplicate);
    }

    await this.prisma.$transaction(async (tx) => {
      if (Object.keys(fields).length > 0) {
        await tx.celebrationTemplate.update({ where: { id }, data: fields });
      }
      if (!steps) return;
      const kept = new Set(steps.flatMap((s) => (s.id ? [s.id] : [])));
      // Les étapes retirées disparaissent du modèle ; les feuilles qui s'en servaient gardent leur
      // étape (templateStepId passe à null : elle devient une étape libre), rien n'est perdu.
      await tx.celebrationTemplateStep.deleteMany({
        where: { templateId: id, id: { notIn: [...kept] } },
      });
      await tx.$executeRaw`UPDATE "CelebrationTemplateStep" SET "order" = "order" + ${ORDER_OFFSET} WHERE "templateId" = ${id}`;
      const keys = uniqueStepKeys(
        steps.map((s) => ({
          title: s.title,
          key: s.id ? current.steps.find((c) => c.id === s.id)?.key : undefined,
        })),
      );
      for (const [i, step] of steps.entries()) {
        if (step.id) {
          await tx.celebrationTemplateStep.update({
            where: { id: step.id },
            data: { title: step.title, order: i + 1 },
          });
        } else {
          await tx.celebrationTemplateStep.create({
            data: {
              templateId: id,
              title: step.title,
              key: keys[i],
              order: i + 1,
              isRequired: true,
            },
          });
        }
      }
    });
    return this.findById(id);
  }

  /** Supprime le modèle. Les feuilles déjà créées gardent leurs étapes (modèle détaché). */
  async remove(id: string) {
    await this.findById(id);
    await this.prisma.celebrationTemplate.delete({ where: { id } });
  }
}
