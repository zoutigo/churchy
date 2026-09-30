import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ParishesService } from '../parishes/parishes.service';
import { CelebrationsService } from '../celebrations/celebrations.service';

@ApiTags('public')
@Controller('public')
export class PublicController {
  constructor(
    private parishes: ParishesService,
    private celebrations: CelebrationsService,
  ) {}

  @Get('parishes')
  findAll(@Query('q') q?: string) {
    return this.parishes.findAll(q);
  }

  @Get('parishes/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.parishes.findBySlug(slug);
  }

  @Get('parishes/:slug/celebrations')
  findCelebrations(@Param('slug') slug: string) {
    return this.celebrations.findPublishedByParishSlug(slug);
  }

  @Get('celebrations/:id')
  findOne(@Param('id') id: string) {
    return this.celebrations.findPublishedById(id);
  }
}
