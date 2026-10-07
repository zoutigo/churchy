import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  listParishMembersSchema,
  updateMemberSchema,
  type ListParishMembersQuery,
  type UpdateMemberDto,
} from '@churchy/shared';
import { env } from '../../config/env';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator';
import { ParishAccess } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ParishRolesGuard } from '../../common/guards/parish-roles.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ParishMembersService } from './parish-members.service';

/**
 * Suivre une paroisse (devenir fidèle) : toute personne connectée, pour elle-même, sans `@ParishAccess`
 * (on n'est pas encore membre). Limité comme l'authentification : c'est une écriture ouverte à tous.
 */
@ApiTags('parish-members')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('parishes/:parishId')
export class ParishFollowController {
  constructor(private service: ParishMembersService) {}

  @Get('membership')
  membership(@Param('parishId') parishId: string, @CurrentUser() user: AuthUser) {
    return this.service
      .membership(parishId, user.id)
      .then((m) => m ?? { status: null, duties: [] });
  }

  @Post('follow')
  @Throttle({ default: { limit: env.AUTH_THROTTLE_LIMIT, ttl: 60_000 } })
  follow(@Param('parishId') parishId: string, @CurrentUser() user: AuthUser) {
    return this.service.follow(parishId, user.id);
  }

  @Delete('follow')
  @HttpCode(200)
  async leave(@Param('parishId') parishId: string, @CurrentUser() user: AuthUser) {
    return { membership: await this.service.leave(parishId, user.id) };
  }
}

/** Gestion des membres : administrateurs de la paroisse seulement. */
@ApiTags('parish-members')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ParishRolesGuard)
@Controller('parishes/:parishId/members')
export class ParishMembersController {
  constructor(private service: ParishMembersService) {}

  @Get()
  @ParishAccess('parish.manage')
  list(
    @Param('parishId') parishId: string,
    @Query(new ZodValidationPipe(listParishMembersSchema)) query: ListParishMembersQuery,
  ) {
    return this.service.list(parishId, query);
  }

  @Patch(':userId')
  @ParishAccess('parish.manage')
  update(
    @Param('parishId') parishId: string,
    @Param('userId') userId: string,
    @Body(new ZodValidationPipe(updateMemberSchema)) dto: UpdateMemberDto,
  ) {
    return this.service.update(parishId, userId, dto);
  }

  @Delete(':userId')
  @ParishAccess('parish.manage')
  async remove(@Param('parishId') parishId: string, @Param('userId') userId: string) {
    await this.service.remove(parishId, userId);
    return { removed: true };
  }
}
