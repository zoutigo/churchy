import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type {
  CelebrationType,
  PublicActivity,
  PublicAnnouncement,
  PublicCelebration,
  PublicCelebrationSummary,
  PublicParish,
  PublicParishSearchResult,
  SearchParishesQuery,
  SheetStatus,
} from '@churchy/shared';
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
} satisfies Prisma.ParishSelect;

/**
 * Célébrations visibles du public : publiées, ou annoncées par la paroisse avant la publication
 * de la feuille. Les brouillons non annoncés et les archivées ne sortent jamais.
 */
const VISIBLE_CELEBRATION = {
  OR: [{ status: 'PUBLISHED' }, { status: 'DRAFT', announced: true }],
} satisfies Prisma.CelebrationWhereInput;

/** Une célébration reste « à venir » pendant 3 h après son début (durée d'une messe, avec marge). */
const ONGOING_WINDOW_MS = 3 * 60 * 60 * 1000;
const LIST_LIMIT = 50;

type CelebrationRow = {
  id: string;
  title: string;
  date: Date;
  location: string | null;
  status: string;
  template: { type: string };
};

export function toCelebrationSummary(c: CelebrationRow): PublicCelebrationSummary {
  const sheetStatus: SheetStatus = c.status === 'PUBLISHED' ? 'AVAILABLE' : 'IN_PREPARATION';
  return {
    id: c.id,
    title: c.title,
    date: c.date.toISOString(),
    location: c.location,
    type: c.template.type as CelebrationType,
    sheetStatus,
  };
}

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
        select: {
          id: true,
          name: true,
          city: true,
          country: true,
          district: true,
          mainChurch: true,
        },
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
    ]);

    // Prochaine messe de chaque paroisse de la page, en une seule requête (pas de N+1).
    const upcoming = parishes.length
      ? await this.prisma.celebration.findMany({
          where: {
            parishId: { in: parishes.map((p) => p.id) },
            date: { gte: this.upcomingFrom() },
            ...VISIBLE_CELEBRATION,
          },
          orderBy: [{ parishId: 'asc' }, { date: 'asc' }],
          distinct: ['parishId'],
          include: { template: { select: { type: true } } },
        })
      : [];
    const nextByParish = new Map(upcoming.map((c) => [c.parishId, toCelebrationSummary(c)]));

    return {
      items: parishes.map((p) => ({ ...p, nextCelebration: nextByParish.get(p.id) ?? null })),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async getParish(id: string): Promise<PublicParish> {
    const parish = await this.prisma.parish.findUnique({
      where: { id },
      select: PARISH_PUBLIC_SELECT,
    });
    if (!parish) throw new NotFoundException('Paroisse introuvable');
    return parish;
  }

  private async assertParishExists(id: string) {
    const parish = await this.prisma.parish.findUnique({ where: { id }, select: { id: true } });
    if (!parish) throw new NotFoundException('Paroisse introuvable');
  }

  async listCelebrations(parishId: string): Promise<PublicCelebrationSummary[]> {
    await this.assertParishExists(parishId);
    const rows = await this.prisma.celebration.findMany({
      where: { parishId, date: { gte: this.upcomingFrom() }, ...VISIBLE_CELEBRATION },
      include: { template: { select: { type: true } } },
      orderBy: { date: 'asc' },
      take: LIST_LIMIT,
    });
    return rows.map(toCelebrationSummary);
  }

  async getCelebration(id: string): Promise<PublicCelebration> {
    const row = await this.prisma.celebration.findFirst({
      where: { id, ...VISIBLE_CELEBRATION },
      include: {
        template: { select: { type: true } },
        parish: { select: { id: true, name: true, city: true } },
        steps: { include: { content: true }, orderBy: { order: 'asc' } },
      },
    });
    if (!row) throw new NotFoundException('Célébration introuvable');

    const summary = toCelebrationSummary(row);
    // Le déroulement n'est public qu'une fois la feuille publiée.
    const steps =
      summary.sheetStatus === 'AVAILABLE'
        ? row.steps.map((s) => ({
            id: s.id,
            title: s.title,
            order: s.order,
            customText: s.customText,
            content: s.content ? { title: s.content.title, body: s.content.body } : null,
          }))
        : [];
    return { ...summary, parish: row.parish, steps };
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
