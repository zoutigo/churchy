import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import {
  platformUsersQuerySchema,
  updatePlatformRoleSchema,
  type PlatformUsersQuery,
  type UpdatePlatformRoleDto,
} from '@churchy/shared';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator';
import { RequirePlatformPermission } from '../../common/decorators/platform-permission.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PlatformPermissionGuard } from '../../common/guards/platform-permission.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { PlatformService } from './platform.service';

const contextOf = (req: Request) => ({ ip: req.ip, userAgent: req.headers['user-agent'] });

/** Espace plateforme : comptes, rôles et suspensions. Chaque route déclare sa permission. */
@ApiTags('platform')
@ApiBearerAuth()
@Controller('platform')
@UseGuards(JwtAuthGuard, PlatformPermissionGuard)
export class PlatformController {
  constructor(private platform: PlatformService) {}

  @Get('users')
  @RequirePlatformPermission('platform.users.read')
  listUsers(@Query(new ZodValidationPipe(platformUsersQuerySchema)) query: PlatformUsersQuery) {
    return this.platform.listUsers(query);
  }

  @Patch('users/:id/role')
  @RequirePlatformPermission('platform.roles.manage')
  changeRole(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updatePlatformRoleSchema)) dto: UpdatePlatformRoleDto,
    @Req() req: Request,
  ) {
    return this.platform.changeRole(actor, id, dto.role, contextOf(req));
  }

  @Post('users/:id/suspend')
  @HttpCode(200)
  @RequirePlatformPermission('platform.users.suspend')
  suspend(@CurrentUser() actor: AuthUser, @Param('id') id: string, @Req() req: Request) {
    return this.platform.suspend(actor, id, contextOf(req));
  }

  @Post('users/:id/reinstate')
  @HttpCode(200)
  @RequirePlatformPermission('platform.users.suspend')
  reinstate(@CurrentUser() actor: AuthUser, @Param('id') id: string, @Req() req: Request) {
    return this.platform.reinstate(actor, id, contextOf(req));
  }
}
