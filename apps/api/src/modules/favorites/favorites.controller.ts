import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { mergeFavoritesSchema, type MergeFavoritesDto } from '@churchy/shared';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { FavoritesService } from './favorites.service';

/**
 * Favoris de l'utilisateur courant. Pas de `@ParishAccess` : les paroisses sont publiques, un favori
 * n'est lié qu'au compte et ne donne aucun droit.
 */
@ApiTags('favorites')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('favorites')
export class FavoritesController {
  constructor(private service: FavoritesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.service.list(user.id);
  }

  @Post('merge')
  @HttpCode(200)
  merge(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(mergeFavoritesSchema)) dto: MergeFavoritesDto,
  ) {
    return this.service.merge(user.id, dto.parishIds);
  }

  @Put(':parishId')
  @HttpCode(204)
  add(@CurrentUser() user: AuthUser, @Param('parishId') parishId: string) {
    return this.service.add(user.id, parishId);
  }

  @Delete(':parishId')
  @HttpCode(204)
  remove(@CurrentUser() user: AuthUser, @Param('parishId') parishId: string) {
    return this.service.remove(user.id, parishId);
  }
}
