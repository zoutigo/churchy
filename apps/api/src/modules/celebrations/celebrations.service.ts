import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  checkScheduleWindow,
  SCHEDULE_WINDOW_MESSAGES,
  zonedToUtc,
  type AddOccurrencesDto,
  type CancelOccurrenceDto,
  type CelebrationDetail,
  type CelebrationListItem,
  type CelebrationType,
  type CreateCelebrationDto,
  type OccurrenceDetail,
  type OccurrenceView,
  type UpdateCelebrationDto,
  type UpdateOccurrenceDto,
  ERR,
} from '@churchy/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { sanitizeRichText } from '../../common/rich-text';
import type { ParishRoleValue } from '../../common/decorators/parish-role.decorator';
import {
  PAST_MESSAGE,
  assertNotPast,
  canSeeInternalNotes,
  isEndingSoon,
  isPast,
  resolveSchedule,
  scheduleError,
} from './celebration.rules';
import { toSheetView, toSheetSummary, SHEET_INCLUDE } from './sheet.mapper';

const iso = (d: Date | null) => (d ? d.toISOString() : null);

/**
 * Séries de célébrations et leurs dates (occurrences). Le passé est immuable : une date commencée
 * ne peut plus être modifiée, annulée ni préparée.
 */
@Injectable()
export class CelebrationsService {
  constructor(private prisma: PrismaService) {}

  private async assertTemplate(parishId: string, templateId: string) {
    const template = await this.prisma.celebrationTemplate.findUnique({
      where: { id: templateId },
      select: { parishId: true },
    });
    // Un modèle d'une autre paroisse ne doit pas être utilisable.
    if (!template || template.parishId !== parishId) {
      throw new NotFoundException(ERR.templateNotFound);
    }
  }

  private async parishTimezone(parishId: string): Promise<string> {
    const parish = await this.prisma.parish.findUnique({
      where: { id: parishId },
      select: { timezone: true },
    });
    if (!parish) throw new NotFoundException(ERR.parishNotFound);
    return parish.timezone;
  }

  async create(
    parishId: string,
    dto: CreateCelebrationDto,
    userId: string,
  ): Promise<CelebrationDetail> {
    const timezone = await this.parishTimezone(parishId);
    const instants = resolveSchedule(dto.schedule, timezone, new Date());
    if (dto.templateId) await this.assertTemplate(parishId, dto.templateId);

    const created = await this.prisma.celebration.create({
      data: {
        parishId,
        title: dto.title,
        type: dto.type,
        location: dto.location,
        announced: dto.announced ?? false,
        description: dto.description ? sanitizeRichText(dto.description) : undefined,
        internalNote: dto.internalNote,
        defaultTemplateId: dto.templateId,
        createdById: userId,
        occurrences: { create: instants.map((startsAt) => ({ parishId, startsAt })) },
      },
      select: { id: true },
    });
    return this.loadDetail(created.id, true);
  }

  async findByParish(parishId: string): Promise<CelebrationListItem[]> {
    const now = new Date();
    const rows = await this.prisma.celebration.findMany({
      where: { parishId },
      include: {
        defaultTemplate: { select: { id: true, name: true } },
        occurrences: {
          select: { id: true, startsAt: true, status: true },
          orderBy: { startsAt: 'asc' },
        },
      },
    });
    const items = rows.map((c): CelebrationListItem => {
      const upcoming = c.occurrences.filter((o) => !isPast(o.startsAt, now));
      const next = upcoming.find((o) => o.status === 'SCHEDULED') ?? upcoming[0] ?? null;
      const last = c.occurrences.at(-1)?.startsAt ?? null;
      return {
        id: c.id,
        title: c.title,
        type: c.type as CelebrationType,
        location: c.location,
        announced: c.announced,
        archivedAt: iso(c.archivedAt),
        defaultTemplate: c.defaultTemplate,
        occurrenceCount: c.occurrences.length,
        upcomingCount: upcoming.length,
        nextOccurrence: next
          ? { id: next.id, startsAt: next.startsAt.toISOString(), status: next.status }
          : null,
        lastOccurrenceAt: iso(last),
        endingSoon: !c.archivedAt && isEndingSoon(last, now),
      };
    });
    // Séries à venir d'abord (prochaine date la plus proche en tête), puis les séries terminées, récentes d'abord.
    return items.sort((a, b) => {
      if (a.nextOccurrence && b.nextOccurrence) {
        return a.nextOccurrence.startsAt.localeCompare(b.nextOccurrence.startsAt);
      }
      if (a.nextOccurrence) return -1;
      if (b.nextOccurrence) return 1;
      return (b.lastOccurrenceAt ?? '').localeCompare(a.lastOccurrenceAt ?? '');
    });
  }

  private occurrenceView(
    o: {
      id: string;
      celebrationId: string;
      startsAt: Date;
      status: 'SCHEDULED' | 'CANCELLED';
      cancelReason: string | null;
      description: string | null;
      internalNote: string | null;
      sheet: Parameters<typeof toSheetSummary>[0] | null;
    },
    now: Date,
    withInternal: boolean,
  ): OccurrenceView {
    return {
      id: o.id,
      celebrationId: o.celebrationId,
      startsAt: o.startsAt.toISOString(),
      isPast: isPast(o.startsAt, now),
      status: o.status,
      cancelReason: o.cancelReason,
      description: o.description,
      ...(withInternal && { internalNote: o.internalNote }),
      sheet: o.sheet ? toSheetSummary(o.sheet) : null,
    };
  }

  private async loadDetail(id: string, withInternal: boolean): Promise<CelebrationDetail> {
    const now = new Date();
    const c = await this.prisma.celebration.findUnique({
      where: { id },
      include: {
        parish: { select: { timezone: true } },
        defaultTemplate: { select: { id: true, name: true } },
        occurrences: {
          orderBy: { startsAt: 'asc' },
          include: {
            sheet: { include: { steps: { select: { contentId: true, customText: true } } } },
          },
        },
      },
    });
    if (!c) throw new NotFoundException(ERR.celebrationNotFound);
    const last = c.occurrences.at(-1)?.startsAt ?? null;
    return {
      id: c.id,
      parishId: c.parishId,
      title: c.title,
      type: c.type as CelebrationType,
      location: c.location,
      description: c.description,
      ...(withInternal && { internalNote: c.internalNote }),
      announced: c.announced,
      archivedAt: iso(c.archivedAt),
      defaultTemplate: c.defaultTemplate,
      timezone: c.parish.timezone,
      lastOccurrenceAt: iso(last),
      endingSoon: !c.archivedAt && isEndingSoon(last, now),
      occurrences: c.occurrences.map((o) => this.occurrenceView(o, now, withInternal)),
    };
  }

  findById(id: string, role: ParishRoleValue | undefined): Promise<CelebrationDetail> {
    return this.loadDetail(id, canSeeInternalNotes(role));
  }

  /** Une série dont toutes les dates sont passées est de l'histoire : plus de modification. */
  async update(id: string, dto: UpdateCelebrationDto): Promise<CelebrationDetail> {
    const now = new Date();
    const series = await this.prisma.celebration.findUnique({
      where: { id },
      select: { parishId: true, occurrences: { select: { startsAt: true } } },
    });
    if (!series) throw new NotFoundException(ERR.celebrationNotFound);
    if (series.occurrences.length > 0 && series.occurrences.every((o) => isPast(o.startsAt, now))) {
      throw new ConflictException(PAST_MESSAGE);
    }
    if (dto.defaultTemplateId) await this.assertTemplate(series.parishId, dto.defaultTemplateId);

    await this.prisma.celebration.update({
      where: { id },
      data: {
        ...dto,
        description:
          dto.description === undefined
            ? undefined
            : dto.description === null
              ? null
              : sanitizeRichText(dto.description),
      },
    });
    return this.loadDetail(id, true);
  }

  async archive(id: string) {
    await this.prisma.celebration.update({ where: { id }, data: { archivedAt: new Date() } });
    return this.loadDetail(id, true);
  }

  async unarchive(id: string) {
    await this.prisma.celebration.update({ where: { id }, data: { archivedAt: null } });
    return this.loadDetail(id, true);
  }

  /** Prolonge la série : de nouvelles dates (les dates déjà présentes sont ignorées). */
  async addOccurrences(id: string, dto: AddOccurrencesDto): Promise<CelebrationDetail> {
    const series = await this.prisma.celebration.findUnique({
      where: { id },
      select: { parishId: true, archivedAt: true, parish: { select: { timezone: true } } },
    });
    if (!series) throw new NotFoundException(ERR.celebrationNotFound);
    if (series.archivedAt) throw new ConflictException(ERR.seriesArchived);
    const instants = resolveSchedule(dto.schedule, series.parish.timezone, new Date());
    await this.prisma.celebrationOccurrence.createMany({
      data: instants.map((startsAt) => ({
        celebrationId: id,
        parishId: series.parishId,
        startsAt,
      })),
      skipDuplicates: true,
    });
    return this.loadDetail(id, true);
  }

  private async findOccurrence(id: string) {
    const occurrence = await this.prisma.celebrationOccurrence.findUnique({
      where: { id },
      include: { parish: { select: { timezone: true } } },
    });
    if (!occurrence) throw new NotFoundException(ERR.occurrenceNotFound);
    return occurrence;
  }

  async getOccurrence(id: string, role: ParishRoleValue | undefined): Promise<OccurrenceDetail> {
    const now = new Date();
    const withInternal = canSeeInternalNotes(role);
    const o = await this.prisma.celebrationOccurrence.findUnique({
      where: { id },
      include: {
        parish: { select: { timezone: true } },
        celebration: { include: { defaultTemplate: { select: { id: true, name: true } } } },
        sheet: { include: SHEET_INCLUDE },
      },
    });
    if (!o) throw new NotFoundException(ERR.occurrenceNotFound);
    const view = this.occurrenceView(
      { ...o, sheet: o.sheet ? { ...o.sheet } : null },
      now,
      withInternal,
    );
    return {
      ...view,
      parishId: o.parishId,
      timezone: o.parish.timezone,
      celebration: {
        id: o.celebration.id,
        title: o.celebration.title,
        type: o.celebration.type as CelebrationType,
        location: o.celebration.location,
        description: o.celebration.description,
        ...(withInternal && { internalNote: o.celebration.internalNote }),
        announced: o.celebration.announced,
        defaultTemplate: o.celebration.defaultTemplate,
      },
      sheet: o.sheet ? { ...toSheetSummary(o.sheet), ...toSheetView(o.sheet) } : null,
    };
  }

  async updateOccurrence(id: string, dto: UpdateOccurrenceDto): Promise<OccurrenceView> {
    const now = new Date();
    const occurrence = await this.findOccurrence(id);
    assertNotPast(occurrence.startsAt, now);

    let startsAt: Date | undefined;
    if (dto.start) {
      startsAt = zonedToUtc(dto.start.date, dto.start.time, occurrence.parish.timezone);
      const problem = checkScheduleWindow([startsAt], now);
      if (problem) throw scheduleError(SCHEDULE_WINDOW_MESSAGES[problem]);
    }

    try {
      await this.prisma.celebrationOccurrence.update({
        where: { id },
        data: {
          startsAt,
          description:
            dto.description === undefined
              ? undefined
              : dto.description === null
                ? null
                : sanitizeRichText(dto.description),
          internalNote: dto.internalNote,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException(ERR.seriesAlreadyHasDate);
      }
      throw err;
    }
    return this.occurrenceViewById(id);
  }

  private async occurrenceViewById(id: string): Promise<OccurrenceView> {
    const o = await this.prisma.celebrationOccurrence.findUniqueOrThrow({
      where: { id },
      include: { sheet: { include: { steps: { select: { contentId: true, customText: true } } } } },
    });
    return this.occurrenceView(o, new Date(), true);
  }

  async cancelOccurrence(id: string, dto: CancelOccurrenceDto): Promise<OccurrenceView> {
    const occurrence = await this.findOccurrence(id);
    assertNotPast(occurrence.startsAt, new Date());
    await this.prisma.celebrationOccurrence.update({
      where: { id },
      data: { status: 'CANCELLED', cancelReason: dto.reason ?? null },
    });
    return this.occurrenceViewById(id);
  }

  async reinstateOccurrence(id: string): Promise<OccurrenceView> {
    const occurrence = await this.findOccurrence(id);
    assertNotPast(occurrence.startsAt, new Date());
    await this.prisma.celebrationOccurrence.update({
      where: { id },
      data: { status: 'SCHEDULED', cancelReason: null },
    });
    return this.occurrenceViewById(id);
  }
}
