import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ParishesService } from './parishes.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { createParishSchema } from '@churchy/shared';

@ApiTags('parishes')
@Controller('parishes')
export class ParishesController {
  constructor(private parishesService: ParishesService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  create(@Body(new ZodValidationPipe(createParishSchema)) dto: any, @CurrentUser() user: any) {
    return this.parishesService.create(dto, user.id);
  }

  @Get('my')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  findMyParishes(@CurrentUser() user: any) {
    return this.parishesService.findByUser(user.id);
  }

  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.parishesService.findBySlug(slug);
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.parishesService.findById(id);
  }
}
