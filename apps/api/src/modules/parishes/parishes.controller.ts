import { Controller, Post, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ParishesService } from './parishes.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  createParishSchema,
  updateParishSchema,
  type CreateParishDto,
  type UpdateParishDto,
} from '@churchy/shared';
import { ParishRolesGuard } from '../../common/guards/parish-roles.guard';
import { ADMINS, ALL_MEMBERS, ParishAccess } from '../../common/decorators/roles.decorator';

@ApiTags('parishes')
@Controller('parishes')
export class ParishesController {
  constructor(private parishesService: ParishesService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  create(
    @Body(new ZodValidationPipe(createParishSchema)) dto: CreateParishDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.parishesService.create(dto, user.id);
  }

  @Get('my')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  findMyParishes(@CurrentUser() user: AuthUser) {
    return this.parishesService.findByUser(user.id);
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, ParishRolesGuard)
  @ParishAccess(ALL_MEMBERS)
  findOne(@Param('id') id: string) {
    return this.parishesService.findById(id);
  }

  /** Informations publiques de la paroisse (adresse, coordonnées, photo…) : réservé aux administrateurs. */
  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, ParishRolesGuard)
  @ParishAccess(ADMINS)
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateParishSchema)) dto: UpdateParishDto,
  ) {
    return this.parishesService.update(id, dto);
  }
}
