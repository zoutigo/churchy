import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { createActivitySchema, type CreateActivityDto } from '@churchy/shared';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator';
import { ALL_MEMBERS, EDITORS, ParishAccess } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ParishRolesGuard } from '../../common/guards/parish-roles.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ActivitiesService } from './activities.service';

@ApiTags('activities')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ParishRolesGuard)
@Controller('parishes/:parishId/activities')
export class ActivitiesController {
  constructor(private service: ActivitiesService) {}

  @Post()
  @ParishAccess(EDITORS)
  create(
    @Param('parishId') parishId: string,
    @Body(new ZodValidationPipe(createActivitySchema)) dto: CreateActivityDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.create(parishId, dto, user.id);
  }

  @Get()
  @ParishAccess(ALL_MEMBERS)
  findByParish(@Param('parishId') parishId: string) {
    return this.service.findByParish(parishId);
  }

  @Delete(':activityId')
  @ParishAccess(EDITORS)
  remove(@Param('parishId') parishId: string, @Param('activityId') id: string) {
    return this.service.remove(parishId, id);
  }
}
