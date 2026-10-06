import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CelebrationsService } from './celebrations.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  addOccurrencesSchema,
  cancelOccurrenceSchema,
  createCelebrationSchema,
  updateCelebrationSchema,
  updateOccurrenceSchema,
  type AddOccurrencesDto,
  type CancelOccurrenceDto,
  type CreateCelebrationDto,
  type UpdateCelebrationDto,
  type UpdateOccurrenceDto,
} from '@churchy/shared';
import { ParishRolesGuard } from '../../common/guards/parish-roles.guard';
import { ParishAccess } from '../../common/decorators/roles.decorator';
import {
  CurrentParishRole,
  type ParishRoleValue,
} from '../../common/decorators/parish-role.decorator';

@ApiTags('celebrations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ParishRolesGuard)
@Controller()
export class CelebrationsController {
  constructor(private service: CelebrationsService) {}

  /** Crée une série : une ou plusieurs dates (ponctuelles ou récurrence), feuilles créées à la demande. */
  @Post('parishes/:parishId/celebrations')
  @ParishAccess('parish.celebrations.write')
  create(
    @Param('parishId') parishId: string,
    @Body(new ZodValidationPipe(createCelebrationSchema)) dto: CreateCelebrationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.create(parishId, dto, user.id);
  }

  @Get('parishes/:parishId/celebrations')
  @ParishAccess('parish.internal.read')
  findByParish(@Param('parishId') parishId: string) {
    return this.service.findByParish(parishId);
  }

  @Get('celebrations/:id')
  @ParishAccess('parish.internal.read', 'celebration')
  findOne(@Param('id') id: string, @CurrentParishRole() role: ParishRoleValue | undefined) {
    return this.service.findById(id, role);
  }

  @Patch('celebrations/:id')
  @ParishAccess('parish.celebrations.write', 'celebration')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateCelebrationSchema)) dto: UpdateCelebrationDto,
  ) {
    return this.service.update(id, dto);
  }

  @Post('celebrations/:id/archive')
  @ParishAccess('parish.celebrations.write', 'celebration')
  archive(@Param('id') id: string) {
    return this.service.archive(id);
  }

  @Post('celebrations/:id/unarchive')
  @ParishAccess('parish.celebrations.write', 'celebration')
  unarchive(@Param('id') id: string) {
    return this.service.unarchive(id);
  }

  /** Prolonge la série avec de nouvelles dates. */
  @Post('celebrations/:id/occurrences')
  @ParishAccess('parish.celebrations.write', 'celebration')
  addOccurrences(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(addOccurrencesSchema)) dto: AddOccurrencesDto,
  ) {
    return this.service.addOccurrences(id, dto);
  }

  @Get('occurrences/:id')
  @ParishAccess('parish.internal.read', 'occurrence')
  findOccurrence(@Param('id') id: string, @CurrentParishRole() role: ParishRoleValue | undefined) {
    return this.service.getOccurrence(id, role);
  }

  @Patch('occurrences/:id')
  @ParishAccess('parish.celebrations.write', 'occurrence')
  updateOccurrence(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateOccurrenceSchema)) dto: UpdateOccurrenceDto,
  ) {
    return this.service.updateOccurrence(id, dto);
  }

  @Post('occurrences/:id/cancel')
  @ParishAccess('parish.celebrations.write', 'occurrence')
  cancel(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(cancelOccurrenceSchema)) dto: CancelOccurrenceDto,
  ) {
    return this.service.cancelOccurrence(id, dto);
  }

  @Post('occurrences/:id/reinstate')
  @ParishAccess('parish.celebrations.write', 'occurrence')
  reinstate(@Param('id') id: string) {
    return this.service.reinstateOccurrence(id);
  }
}
