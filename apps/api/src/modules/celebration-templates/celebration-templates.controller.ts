import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Delete,
  Patch,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CelebrationTemplatesService } from './celebration-templates.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  createCelebrationTemplateSchema,
  createTemplateStepSchema,
  updateCelebrationTemplateSchema,
  type UpdateCelebrationTemplateDto,
  type CreateCelebrationTemplateDto,
  type CreateTemplateStepDto,
} from '@churchy/shared';
import { ParishRolesGuard } from '../../common/guards/parish-roles.guard';
import { ParishAccess } from '../../common/decorators/roles.decorator';

@ApiTags('celebration-templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ParishRolesGuard)
@Controller()
export class CelebrationTemplatesController {
  constructor(private service: CelebrationTemplatesService) {}

  @Post('parishes/:parishId/templates')
  @ParishAccess('parish.celebrations.write')
  create(
    @Param('parishId') parishId: string,
    @Body(new ZodValidationPipe(createCelebrationTemplateSchema)) dto: CreateCelebrationTemplateDto,
  ) {
    return this.service.create(parishId, dto);
  }

  @Get('parishes/:parishId/templates')
  @ParishAccess('parish.internal.read')
  findByParish(@Param('parishId') parishId: string) {
    return this.service.findByParish(parishId);
  }

  @Get('templates/:id')
  @ParishAccess('parish.internal.read', 'template')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Patch('templates/:id')
  @ParishAccess('parish.celebrations.write', 'template')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateCelebrationTemplateSchema)) dto: UpdateCelebrationTemplateDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete('templates/:id')
  @HttpCode(204)
  @ParishAccess('parish.celebrations.write', 'template')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Post('templates/:templateId/steps')
  @ParishAccess('parish.celebrations.write', 'template', 'templateId')
  addStep(
    @Param('templateId') templateId: string,
    @Body(new ZodValidationPipe(createTemplateStepSchema)) dto: CreateTemplateStepDto,
  ) {
    return this.service.addStep(templateId, dto);
  }

  @Delete('templates/steps/:stepId')
  @ParishAccess('parish.celebrations.write', 'templateStep', 'stepId')
  removeStep(@Param('stepId') stepId: string) {
    return this.service.removeStep(stepId);
  }
}
