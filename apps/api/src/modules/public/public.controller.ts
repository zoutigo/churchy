import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  calendarQuerySchema,
  parishIdsQuerySchema,
  searchParishesSchema,
  type CalendarQuery,
  type ParishIdsQuery,
  type SearchParishesQuery,
} from '@churchy/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { PublicService } from './public.service';

/**
 * Routes sans authentification (pages publiques) : aucun `@ParishAccess` ici, volontairement.
 * Elles ne renvoient que des vues publiques (voir PublicService), jamais les entités Prisma.
 */
@ApiTags('public')
@Controller('public')
export class PublicController {
  constructor(private service: PublicService) {}

  @Get('parishes')
  search(@Query(new ZodValidationPipe(searchParishesSchema)) query: SearchParishesQuery) {
    return this.service.searchParishes(query);
  }

  /** Résumés par identifiants (`?ids=a,b,c`, 10 au plus) : sert à afficher les favoris d'un visiteur. */
  @Get('parishes/summaries')
  summaries(@Query(new ZodValidationPipe(parishIdsQuerySchema)) query: ParishIdsQuery) {
    return this.service.listParishSummaries(query.ids);
  }

  @Get('parishes/:id')
  getParish(@Param('id') id: string) {
    return this.service.getParish(id);
  }

  @Get('parishes/:id/celebrations')
  listCelebrations(@Param('id') id: string) {
    return this.service.listCelebrations(id);
  }

  @Get('parishes/:id/calendar')
  getCalendar(
    @Param('id') id: string,
    @Query(new ZodValidationPipe(calendarQuerySchema)) query: CalendarQuery,
  ) {
    return this.service.getCalendar(id, query);
  }

  @Get('parishes/:id/announcements')
  listAnnouncements(@Param('id') id: string) {
    return this.service.listAnnouncements(id);
  }

  @Get('parishes/:id/activities')
  listActivities(@Param('id') id: string) {
    return this.service.listActivities(id);
  }

  @Get('celebrations/:id')
  getCelebration(@Param('id') id: string) {
    return this.service.getCelebration(id);
  }
}
