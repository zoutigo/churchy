import { Controller, Post, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CelebrationsService } from './celebrations.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { createCelebrationSchema, updateCelebrationStepSchema } from '@churchy/shared';

@ApiTags('celebrations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class CelebrationsController {
  constructor(private service: CelebrationsService) {}

  @Post('parishes/:parishId/celebrations')
  create(
    @Param('parishId') parishId: string,
    @Body(new ZodValidationPipe(createCelebrationSchema)) dto: any,
    @CurrentUser() user: any,
  ) {
    return this.service.create(parishId, dto, user.id);
  }

  @Get('parishes/:parishId/celebrations')
  findByParish(@Param('parishId') parishId: string) {
    return this.service.findByParish(parishId);
  }

  @Get('celebrations/:id')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Patch('celebrations/:id/steps/:stepId')
  updateStep(
    @Param('stepId') stepId: string,
    @Body(new ZodValidationPipe(updateCelebrationStepSchema)) dto: any,
  ) {
    return this.service.updateStep(stepId, dto);
  }

  @Post('celebrations/:id/publish')
  publish(@Param('id') id: string) {
    return this.service.publish(id);
  }

  @Post('celebrations/:id/archive')
  archive(@Param('id') id: string) {
    return this.service.archive(id);
  }
}
