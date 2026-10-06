import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  ERR,
  hasParishPermission,
  hasPlatformPermission,
  type ParishPermission,
} from '@churchy/shared';
import {
  PARISH_PERMISSION_KEY,
  PARISH_SCOPE_KEY,
  type ParishScopeOptions,
} from '../decorators/roles.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ParishRolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    const required = this.reflector.getAllAndOverride<ParishPermission>(
      PARISH_PERMISSION_KEY,
      targets,
    );
    if (!required) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) throw new ForbiddenException(ERR.accessDenied);
    if (user.role === 'SUPER_ADMIN') {
      request.parishRole = 'SUPER_ADMIN';
      return true;
    }

    const scope = this.reflector.getAllAndOverride<ParishScopeOptions>(PARISH_SCOPE_KEY, targets);
    const parishId = await this.resolveParishId(request.params ?? {}, scope);

    const member = await this.prisma.parishMember.findUnique({
      where: { userId_parishId: { userId: user.id, parishId } },
    });
    if (!member || !hasParishPermission(member, required)) {
      // Repli : ADMIN et MODERATOR de plateforme lisent (jamais n'écrivent) les données internes de toute paroisse
      // dont ils ne sont pas membres avec la permission voulue.
      if (
        hasPlatformPermission(user.role, 'platform.parishes.read') &&
        ['GET', 'HEAD'].includes(request.method)
      ) {
        request.parishRole = 'PLATFORM_STAFF';
        return true;
      }
      throw new ForbiddenException(ERR.parishAccessDenied);
    }
    // Les services s'en servent pour masquer ce que certains rôles ne doivent pas voir (notes internes).
    request.parishRole = { status: member.status, duties: member.duties };
    return true;
  }

  private async resolveParishId(
    params: Record<string, string>,
    scope: ParishScopeOptions = { kind: 'parish' },
  ): Promise<string> {
    const id =
      scope.kind === 'parish' ? (params.parishId ?? params.id) : params[scope.param ?? 'id'];
    const notFound = new NotFoundException(ERR.resourceNotFound);
    if (!id) throw notFound;

    let parishId: string | undefined;
    switch (scope.kind) {
      case 'parish':
        parishId = id;
        break;
      case 'template':
        parishId = (
          await this.prisma.celebrationTemplate.findUnique({
            where: { id },
            select: { parishId: true },
          })
        )?.parishId;
        break;
      case 'templateStep':
        parishId = (
          await this.prisma.celebrationTemplateStep.findUnique({
            where: { id },
            select: { template: { select: { parishId: true } } },
          })
        )?.template.parishId;
        break;
      case 'content':
        parishId = (
          await this.prisma.content.findUnique({ where: { id }, select: { parishId: true } })
        )?.parishId;
        break;
      case 'celebration':
        parishId = (
          await this.prisma.celebration.findUnique({ where: { id }, select: { parishId: true } })
        )?.parishId;
        break;
      case 'occurrence':
        parishId = (
          await this.prisma.celebrationOccurrence.findUnique({
            where: { id },
            select: { parishId: true },
          })
        )?.parishId;
        break;
      case 'sheet':
        parishId = (
          await this.prisma.preparationSheet.findUnique({
            where: { id },
            select: { occurrence: { select: { parishId: true } } },
          })
        )?.occurrence.parishId;
        break;
    }
    if (!parishId) throw notFound;
    return parishId;
  }
}
