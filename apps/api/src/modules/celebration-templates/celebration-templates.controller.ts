import { Controller, Post, Get, Param, Body, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CelebrationTemplatesService } from './celebration-templates.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { createCelebrationTemplateSchema, createTemplateStepSchema } from '@churchy/shared';

@ApiTags('celebration-templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class CelebrationTemplatesController {
  constructor(private service: CelebrationTemplatesService) {}

  @Post('parishes/:parishId/templates')
  create(
    @Param('parishId') parishId: string,
    @Body(new ZodValidationPipe(createCelebrationTemplateSchema)) dto: any,
  ) {
    return this.service.create(parishId, dto);
  }

  @Get('parishes/:parishId/templates')
  findByParish(@Param('parishId') parishId: string) {
    return this.service.findByParish(parishId);
  }

  @Get('templates/:id')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post('templates/:templateId/steps')
  addStep(
    @Param('templateId') templateId: string,
    @Body(new ZodValidationPipe(createTemplateStepSchema)) dto: any,
  ) {
    return this.service.addStep(templateId, dto);
  }

  @Delete('templates/steps/:stepId')
  removeStep(@Param('stepId') stepId: string) {
    return this.service.removeStep(stepId);
  }
}
