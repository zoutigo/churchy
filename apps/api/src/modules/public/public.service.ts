import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type {
  CalendarQuery,
  CelebrationType,
  PublicActivity,
  PublicAnnouncement,
  PublicCalendar,
  PublicCelebration,
  PublicCelebrationSummary,
  PublicParish,
  PublicParishSearchResult,
  PublicParishSummary,
  SearchParishesQuery,
  SheetStatus,
} from '@churchy/shared';
import { currentMonth, monthRange } from '@churchy/shared';
import { PrismaService } from '../../prisma/prisma.service';

/** Champs d'une paroisse visibles de tous. Liste blanche : on n'expose jamais l'entité entière. */
const PARISH_PUBLIC_SELECT = {
  id: true,
  name: true,
  description: true,
  city: true,
  country: true,
  region: true,
  district: true,
  address: true,
  addressComplement: true,
  mainChurch: true,
  phone: true,
  email: true,
  website: true,
  imageUrl: true,
  timezone: true,
} satisfies Prisma.ParishSelect;

/** Champs d'une paroisse dans une liste (résultats de recherche, favoris). */
const PARISH_SUMMARY_SELECT = {
  id: true,
  name: true,
  city: true,
  country: true,
  district: true,
  mainChurch: true,
  timezone: true,
} satisfies Prisma.ParishSelect;

/**
 * Dates visibles du public : celles des séries annoncées et non archivées. Une date dont la feuille n'est
 * pas publiée s'affiche « en préparation » ; une date annulée reste affichée, marquée comme telle.
 * Les séries non annoncées et archivées ne sortent jamais.
 */
const VISIBLE_OCCURRENCE = {
  celebration: { announced: true, archivedAt: null },
} satisfies Prisma.CelebrationOccurrenceWhereInput;

/** Une date reste « à venir » pendant 3 h après son début (durée d'une messe, avec marge). */
const ONGOING_WINDOW_MS = 3 * 60 * 60 * 1000;
const LIST_LIMIT = 50;
const CALENDAR_LIMIT = 400;

type OccurrenceRow = {
  id: string;
  celebrationId: string;
  startsAt: Date;
  status: string;
  cancelReason: string | null;
  celebration: { title: string; type: string; location: string | null };
  sheet: { status: string } | null;
};

export function toCelebrationSummary(o: OccurrenceRow, timezone: string): PublicCelebrationSummary {
  const sheetStatus: SheetStatus = o.sheet?.status === 'PUBLISHED' ? 'AVAILABLE' : 'IN_PREPARATION';
  const cancelled = o.status === 'CANCELLED';
  return {
    id: o.id,
    celebrationId: o.celebrationId,
    title: o.celebration.title,
    date: o.startsAt.toISOString(),
    location: o.celebration.location,
    type: o.celebration.type as CelebrationType,
    sheetStatus,
    cancelled,
    cancelReason: cancelled ? o.cancelReason : null,
    timezone,
  };
}

const OCCURRENCE_SUMMARY_INCLUDE = {
  celebration: { select: { title: true, type: true, location: true } },
  sheet: { select: { status: true } },
} satisfies Prisma.CelebrationOccurrenceInclude;

/** Un mot de la recherche doit se retrouver dans au moins un des champs d'identification. */
export function buildSearchWhere(q?: string): Prisma.ParishWhereInput {
  const words = (q ?? '').split(/\s+/).filter(Boolean).slice(0, 5);
  if (words.length === 0) return {};
  return {
    AND: words.map((word) => ({
      OR: (['name', 'city', 'district', 'mainChurch', 'address'] as const).map((field) => ({
        [field]: { contains: word, mode: 'insensitive' as const },
      })),
    })),
  };
}

/** Lecture publique, sans authentification : tout ce qui sort d'ici est visible de n'importe qui. */
@Injectable()
export class PublicService {
  constructor(private prisma: PrismaService) {}

  private upcomingFrom() {
    return new Date(Date.now() - ONGOING_WINDOW_MS);
  }

  async searchParishes(query: SearchParishesQuery): Promise<PublicParishSearchResult> {
    const where = buildSearchWhere(query.q);
    const [total, parishes] = await Promise.all([
      this.prisma.parish.count({ where }),
      this.prisma.parish.findMany({
        where,
        select: PARISH_SUMMARY_SELECT,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
    ]);
    return {
      items: await this.withNextCelebration(parishes),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  /**
   * Résumés des paroisses demandées, dans l'ordre des identifiants reçus (favoris). Les identifiants
   * inconnus (paroisse supprimée) sont simplement ignorés.
   */
  async listParishSummaries(ids: string[]): Promise<PublicParishSummary[]> {
    if (ids.length === 0) return [];
    const parishes = await this.prisma.parish.findMany({
      where: { id: { in: ids } },
      select: PARISH_SUMMARY_SELECT,
    });
    const byId = new Map(parishes.map((p) => [p.id, p]));
    const ordered = ids.flatMap((id) => byId.get(id) ?? []);
    return this.withNextCelebration(ordered);
  }

  /** Prochaine messe de chaque paroisse, en une seule requête (pas de N+1). */
  private async withNextCelebration(
    parishes: (Omit<PublicParishSummary, 'nextCelebration'> & { timezone: string })[],
  ): Promise<PublicParishSummary[]> {
    const upcoming = parishes.length
      ? await this.prisma.celebrationOccurrence.findMany({
          where: {
            parishId: { in: parishes.map((p) => p.id) },
            startsAt: { gte: this.upcomingFrom() },
            status: 'SCHEDULED',
            ...VISIBLE_OCCURRENCE,
          },
          orderBy: [{ parishId: 'asc' }, { startsAt: 'asc' }],
          distinct: ['parishId'],
          include: OCCURRENCE_SUMMARY_INCLUDE,
        })
      : [];
    const timezones = new Map(parishes.map((p) => [p.id, p.timezone]));
    const nextByParish = new Map(
      upcoming.map((o) => [o.parishId, toCelebrationSummary(o, timezones.get(o.parishId)!)]),
    );
    return parishes.map(({ timezone: _tz, ...p }) => ({
      ...p,
      nextCelebration: nextByParish.get(p.id) ?? null,
    }));
  }

  async getParish(id: string): Promise<PublicParish> {
    const parish = await this.prisma.parish.findUnique({
      where: { id },
      select: PARISH_PUBLIC_SELECT,
    });
    if (!parish) throw new NotFoundException('Paroisse introuvable');
    return parish;
  }

  private async parishTimezone(id: string): Promise<string> {
    const parish = await this.prisma.parish.findUnique({
      where: { id },
      select: { timezone: true },
    });
    if (!parish) throw new NotFoundException('Paroisse introuvable');
    return parish.timezone;
  }

  private async assertParishExists(id: string) {
    await this.parishTimezone(id);
  }

  async listCelebrations(parishId: string): Promise<PublicCelebrationSummary[]> {
    const timezone = await this.parishTimezone(parishId);
    const rows = await this.prisma.celebrationOccurrence.findMany({
      where: { parishId, startsAt: { gte: this.upcomingFrom() }, ...VISIBLE_OCCURRENCE },
      include: OCCURRENCE_SUMMARY_INCLUDE,
      orderBy: { startsAt: 'asc' },
      take: LIST_LIMIT,
    });
    return rows.map((o) => toCelebrationSummary(o, timezone));
  }

  /**
   * Calendrier : toutes les dates visibles d'un mois (dans le fuseau de la paroisse), passées comprises,
   * annulées comprises. Mois courant par défaut.
   */
  async getCalendar(parishId: string, query: CalendarQuery): Promise<PublicCalendar> {
    const timezone = await this.parishTimezone(parishId);
    const month = query.month ?? currentMonth(timezone);
    const { start, end } = monthRange(month, timezone);
    const rows = await this.prisma.celebrationOccurrence.findMany({
      where: { parishId, startsAt: { gte: start, lt: end }, ...VISIBLE_OCCURRENCE },
      include: OCCURRENCE_SUMMARY_INCLUDE,
      orderBy: { startsAt: 'asc' },
      take: CALENDAR_LIMIT,
    });
    return { month, timezone, items: rows.map((o) => toCelebrationSummary(o, timezone)) };
  }

  /** `id` est celui d'une date (occurrence) : la page d'une messe précise. */
  async getCelebration(id: string): Promise<PublicCelebration> {
    const row = await this.prisma.celebrationOccurrence.findFirst({
      where: { id, ...VISIBLE_OCCURRENCE },
      include: {
        celebration: {
          select: { title: true, type: true, location: true, description: true },
        },
        parish: { select: { id: true, name: true, city: true, timezone: true } },
        sheet: {
          include: { steps: { include: { content: true }, orderBy: { order: 'asc' } } },
        },
      },
    });
    if (!row) throw new NotFoundException('Célébration introuvable');

    const summary = toCelebrationSummary(row, row.parish.timezone);
    // Le déroulement n'est public qu'une fois la feuille publiée, et jamais pour une date annulée.
    const steps =
      summary.sheetStatus === 'AVAILABLE' && !summary.cancelled && row.sheet
        ? row.sheet.steps.map((s) => ({
            id: s.id,
            title: s.title,
            order: s.order,
            customText: s.customText,
            content: s.content ? { title: s.content.title, body: s.content.body } : null,
          }))
        : [];
    return {
      ...summary,
      description: row.celebration.description,
      occurrenceDescription: row.description,
      parish: { id: row.parish.id, name: row.parish.name, city: row.parish.city },
      steps,
    };
  }

  async listAnnouncements(parishId: string): Promise<PublicAnnouncement[]> {
    await this.assertParishExists(parishId);
    const rows = await this.prisma.announcement.findMany({
      where: { parishId },
      orderBy: { publishedAt: 'desc' },
      take: LIST_LIMIT,
    });
    return rows.map((a) => ({
      id: a.id,
      title: a.title,
      summary: a.summary,
      body: a.body,
      imageUrl: a.imageUrl,
      publishedAt: a.publishedAt.toISOString(),
    }));
  }

  async listActivities(parishId: string): Promise<PublicActivity[]> {
    await this.assertParishExists(parishId);
    const rows = await this.prisma.activity.findMany({
      where: { parishId, startsAt: { gte: this.upcomingFrom() } },
      orderBy: { startsAt: 'asc' },
      take: LIST_LIMIT,
    });
    return rows.map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      startsAt: a.startsAt.toISOString(),
      location: a.location,
      imageUrl: a.imageUrl,
    }));
  }
}
