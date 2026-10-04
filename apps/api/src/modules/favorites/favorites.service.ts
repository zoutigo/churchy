import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { MAX_FAVORITE_PARISHES, type PublicParishSummary, ERR } from '@churchy/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { PublicService } from '../public/public.service';

/** Paroisses favorites d'un utilisateur connecté. Un favori n'accorde aucun droit sur la paroisse. */
@Injectable()
export class FavoritesService {
  constructor(
    private prisma: PrismaService,
    private publicService: PublicService,
  ) {}

  /** Favoris dans l'ordre d'ajout (le plus ancien d'abord : le premier est « ma paroisse »). */
  async list(userId: string): Promise<PublicParishSummary[]> {
    const rows = await this.prisma.favoriteParish.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'asc' }, { parishId: 'asc' }],
      select: { parishId: true },
    });
    return this.publicService.listParishSummaries(rows.map((r) => r.parishId));
  }

  /** Idempotent : ajouter une paroisse déjà en favori ne change rien et ne compte pas dans la limite. */
  async add(userId: string, parishId: string): Promise<void> {
    const parish = await this.prisma.parish.findUnique({
      where: { id: parishId },
      select: { id: true },
    });
    if (!parish) throw new NotFoundException(ERR.parishNotFound);

    const existing = await this.prisma.favoriteParish.findMany({
      where: { userId },
      select: { parishId: true },
    });
    if (existing.some((f) => f.parishId === parishId)) return;
    if (existing.length >= MAX_FAVORITE_PARISHES) {
      throw new ConflictException(ERR.favoritesLimit);
    }
    await this.prisma.favoriteParish.createMany({
      data: [{ userId, parishId }],
      skipDuplicates: true,
    });
  }

  /** Idempotent : retirer une paroisse qui n'est pas en favori ne produit pas d'erreur. */
  async remove(userId: string, parishId: string): Promise<void> {
    await this.prisma.favoriteParish.deleteMany({ where: { userId, parishId } });
  }

  /**
   * Verse les favoris d'un visiteur (appareil) dans son compte à la connexion : union, sans doublon.
   * Les paroisses inconnues sont ignorées et la limite est respectée (le surplus est écarté).
   */
  async merge(userId: string, parishIds: string[]): Promise<PublicParishSummary[]> {
    const [existing, known] = await Promise.all([
      this.prisma.favoriteParish.findMany({ where: { userId }, select: { parishId: true } }),
      this.prisma.parish.findMany({ where: { id: { in: parishIds } }, select: { id: true } }),
    ]);
    const have = new Set(existing.map((f) => f.parishId));
    const knownIds = new Set(known.map((p) => p.id));
    const room = Math.max(0, MAX_FAVORITE_PARISHES - have.size);
    const toAdd = parishIds.filter((id) => knownIds.has(id) && !have.has(id)).slice(0, room);
    if (toAdd.length) {
      // `createdAt` est identique au sein d'un createMany : on étale pour conserver l'ordre reçu.
      const now = Date.now();
      await this.prisma.favoriteParish.createMany({
        data: toAdd.map((id, i) => ({ userId, parishId: id, createdAt: new Date(now + i) })),
        skipDuplicates: true,
      });
    }
    return this.list(userId);
  }
}
