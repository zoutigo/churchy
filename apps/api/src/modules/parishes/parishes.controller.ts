import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ParishesService } from './parishes.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { createParishSchema, type CreateParishDto } from '@churchy/shared';
import { ParishRolesGuard } from '../../common/guards/parish-roles.guard';
import { ALL_MEMBERS, ParishAccess } from '../../common/decorators/roles.decorator';

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

  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.parishesService.findBySlug(slug);
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, ParishRolesGuard)
  @ParishAccess(ALL_MEMBERS)
  findOne(@Param('id') id: string) {
    return this.parishesService.findById(id);
  }
}
