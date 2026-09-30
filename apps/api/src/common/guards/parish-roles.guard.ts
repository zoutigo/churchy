import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ParishRole } from '@churchy/shared';
import { PARISH_ROLES_KEY } from '../decorators/roles.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ParishRolesGuard implements CanActivate {
  constructor(private reflector: Reflector, private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<ParishRole[]>(
      PARISH_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const parishId = request.params.parishId ?? request.params.id;

    const member = await this.prisma.parishMember.findUnique({
      where: { userId_parishId: { userId: user.id, parishId } },
    });

    if (!member || !requiredRoles.includes(member.role as ParishRole)) {
      throw new ForbiddenException('Accès refusé pour cette paroisse');
    }

    return true;
  }
}
