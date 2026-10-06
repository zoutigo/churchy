import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type User } from '@prisma/client';
import {
  ERR,
  PLATFORM_USERS_PAGE_SIZE,
  UserRole,
  canChangePlatformRole,
  canSuspendAccount,
  type PlatformUserDto,
  type PlatformUsersPageDto,
  type PlatformUsersQuery,
} from '@churchy/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthSecurityService, type RequestContext } from '../auth/auth-security.service';

type Actor = { id: string; role: string };

export const toPlatformUserDto = (u: User): PlatformUserDto => ({
  id: u.id,
  email: u.email,
  firstName: u.firstName,
  lastName: u.lastName,
  role: u.role as UserRole,
  suspendedAt: u.suspendedAt?.toISOString() ?? null,
  createdAt: u.createdAt.toISOString(),
});

/** Gestion des comptes par la plateforme : liste, rôles, suspension. Les règles de hiérarchie sont dans `@churchy/shared`. */
@Injectable()
export class PlatformService {
  constructor(
    private prisma: PrismaService,
    private security: AuthSecurityService,
  ) {}

  async listUsers(query: PlatformUsersQuery): Promise<PlatformUsersPageDto> {
    const q = query.q?.trim();
    const where: Prisma.UserWhereInput = q
      ? {
          OR: [
            { firstName: { contains: q, mode: 'insensitive' } },
            { lastName: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {};
    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (query.page - 1) * PLATFORM_USERS_PAGE_SIZE,
        take: PLATFORM_USERS_PAGE_SIZE,
      }),
    ]);
    return {
      items: users.map(toPlatformUserDto),
      total,
      page: query.page,
      pageSize: PLATFORM_USERS_PAGE_SIZE,
    };
  }

  async changeRole(
    actor: Actor,
    targetId: string,
    next: UserRole,
    context?: RequestContext,
  ): Promise<PlatformUserDto> {
    const updated = await this.prisma.$transaction(
      async (tx) => {
        const target = await tx.user.findUnique({ where: { id: targetId } });
        if (!target) throw new NotFoundException(ERR.platformUserNotFound);
        const current = target.role as UserRole;
        if (current === next) return { user: target, from: current, changed: false };

        if (!canChangePlatformRole(actor.role as UserRole, current, next)) {
          throw new ForbiddenException(ERR.platformRoleForbidden);
        }
        // Il doit toujours rester au moins un super administrateur actif.
        if (current === UserRole.SUPER_ADMIN) {
          const others = await tx.user.count({
            where: { role: UserRole.SUPER_ADMIN, id: { not: target.id }, suspendedAt: null },
          });
          if (others === 0) throw new ConflictException(ERR.platformLastSuperAdmin);
        }
        const user = await tx.user.update({ where: { id: target.id }, data: { role: next } });
        // Le rôle fait foi en base à chaque requête ; on coupe aussi les sessions pour repartir de zéro.
        await tx.refreshToken.updateMany({
          where: { userId: target.id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        return { user, from: current, changed: true };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    if (updated.changed) {
      await this.security.audit({
        event: 'PLATFORM_ROLE_CHANGED',
        status: 'SUCCESS',
        userId: targetId,
        actorId: actor.id,
        detail: `${updated.from}>${next}`,
        context,
      });
    }
    return toPlatformUserDto(updated.user);
  }

  suspend(actor: Actor, targetId: string, context?: RequestContext) {
    return this.setSuspended(actor, targetId, true, context);
  }

  reinstate(actor: Actor, targetId: string, context?: RequestContext) {
    return this.setSuspended(actor, targetId, false, context);
  }

  private async setSuspended(
    actor: Actor,
    targetId: string,
    suspended: boolean,
    context?: RequestContext,
  ): Promise<PlatformUserDto> {
    const target = await this.prisma.user.findUnique({ where: { id: targetId } });
    if (!target) throw new NotFoundException(ERR.platformUserNotFound);
    if (
      !canSuspendAccount(actor.role as UserRole, target.role as UserRole, actor.id === target.id)
    ) {
      throw new ForbiddenException(ERR.platformSuspendForbidden);
    }
    if (Boolean(target.suspendedAt) === suspended) return toPlatformUserDto(target);

    const now = new Date();
    const [user] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: target.id },
        data: { suspendedAt: suspended ? now : null },
      }),
      // Une suspension ferme toutes les sessions ; un rétablissement n'en rouvre aucune (reconnexion).
      this.prisma.refreshToken.updateMany({
        where: { userId: target.id, revokedAt: null },
        data: { revokedAt: now },
      }),
    ]);
    await this.security.audit({
      event: suspended ? 'ACCOUNT_SUSPENDED' : 'ACCOUNT_REINSTATED',
      status: 'SUCCESS',
      userId: target.id,
      actorId: actor.id,
      context,
    });
    return toPlatformUserDto(user);
  }
}
