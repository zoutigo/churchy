import { Controller, Post, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CelebrationsService } from './celebrations.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  createCelebrationSchema,
  setCelebrationAnnouncedSchema,
  updateCelebrationStepSchema,
  type CreateCelebrationDto,
  type SetCelebrationAnnouncedDto,
  type UpdateCelebrationStepDto,
} from '@churchy/shared';
import { ParishRolesGuard } from '../../common/guards/parish-roles.guard';
import { ALL_MEMBERS, EDITORS, ParishAccess } from '../../common/decorators/roles.decorator';

@ApiTags('celebrations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ParishRolesGuard)
@Controller()
export class CelebrationsController {
  constructor(private service: CelebrationsService) {}

  @Post('parishes/:parishId/celebrations')
  @ParishAccess(EDITORS)
  create(
    @Param('parishId') parishId: string,
    @Body(new ZodValidationPipe(createCelebrationSchema)) dto: CreateCelebrationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.create(parishId, dto, user.id);
  }

  @Get('parishes/:parishId/celebrations')
  @ParishAccess(ALL_MEMBERS)
  findByParish(@Param('parishId') parishId: string) {
    return this.service.findByParish(parishId);
  }

  @Get('celebrations/:id')
  @ParishAccess(ALL_MEMBERS, 'celebration')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Patch('celebrations/:id/steps/:stepId')
  @ParishAccess(EDITORS, 'celebration')
  updateStep(
    @Param('id') id: string,
    @Param('stepId') stepId: string,
    @Body(new ZodValidationPipe(updateCelebrationStepSchema)) dto: UpdateCelebrationStepDto,
  ) {
    return this.service.updateStep(id, stepId, dto);
  }

  @Patch('celebrations/:id/announced')
  @ParishAccess(EDITORS, 'celebration')
  setAnnounced(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(setCelebrationAnnouncedSchema)) dto: SetCelebrationAnnouncedDto,
  ) {
    return this.service.setAnnounced(id, dto);
  }

  @Post('celebrations/:id/publish')
  @ParishAccess(EDITORS, 'celebration')
  publish(@Param('id') id: string) {
    return this.service.publish(id);
  }

  @Post('celebrations/:id/archive')
  @ParishAccess(EDITORS, 'celebration')
  archive(@Param('id') id: string) {
    return this.service.archive(id);
  }
}
