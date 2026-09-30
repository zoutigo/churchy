import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ParishRole } from '@churchy/shared';
import {
  PARISH_ROLES_KEY,
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
    const requiredRoles = this.reflector.getAllAndOverride<ParishRole[]>(PARISH_ROLES_KEY, targets);
    if (!requiredRoles) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) throw new ForbiddenException('Accès refusé');
    if (user.role === 'SUPER_ADMIN') return true;

    const scope = this.reflector.getAllAndOverride<ParishScopeOptions>(PARISH_SCOPE_KEY, targets);
    const parishId = await this.resolveParishId(request.params ?? {}, scope);

    const member = await this.prisma.parishMember.findUnique({
      where: { userId_parishId: { userId: user.id, parishId } },
    });
    if (!member || !requiredRoles.includes(member.role as ParishRole)) {
      throw new ForbiddenException('Accès refusé pour cette paroisse');
    }
    return true;
  }

  private async resolveParishId(
    params: Record<string, string>,
    scope: ParishScopeOptions = { kind: 'parish' },
  ): Promise<string> {
    const id =
      scope.kind === 'parish' ? (params.parishId ?? params.id) : params[scope.param ?? 'id'];
    const notFound = new NotFoundException('Ressource introuvable');
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
    }
    if (!parishId) throw notFound;
    return parishId;
  }
}
