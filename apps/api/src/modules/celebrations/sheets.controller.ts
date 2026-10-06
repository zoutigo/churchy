import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  addSheetStepSchema,
  changeSheetTemplateSchema,
  createSheetSchema,
  reorderSheetStepsSchema,
  updateCelebrationStepSchema,
  type AddSheetStepDto,
  type ChangeSheetTemplateDto,
  type CreateSheetDto,
  type ReorderSheetStepsDto,
  type UpdateCelebrationStepDto,
} from '@churchy/shared';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ParishRolesGuard } from '../../common/guards/parish-roles.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ParishAccess } from '../../common/decorators/roles.decorator';
import { SheetsService } from './sheets.service';

@ApiTags('sheets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ParishRolesGuard)
@Controller()
export class SheetsController {
  constructor(private service: SheetsService) {}

  /** Crée (ou renvoie) la feuille d'une date : modèle par défaut, modèle choisi, ou feuille vide (`null`). */
  @Post('occurrences/:id/sheet')
  @ParishAccess('parish.celebrations.write', 'occurrence')
  createForOccurrence(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(createSheetSchema)) dto: CreateSheetDto,
  ) {
    return this.service.createForOccurrence(id, dto);
  }

  @Get('sheets/:id')
  @ParishAccess('parish.internal.read', 'sheet')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Patch('sheets/:id/template')
  @ParishAccess('parish.celebrations.write', 'sheet')
  changeTemplate(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(changeSheetTemplateSchema)) dto: ChangeSheetTemplateDto,
  ) {
    return this.service.changeTemplate(id, dto);
  }

  @Post('sheets/:id/steps')
  @ParishAccess('parish.celebrations.write', 'sheet')
  addStep(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(addSheetStepSchema)) dto: AddSheetStepDto,
  ) {
    return this.service.addStep(id, dto);
  }

  @Patch('sheets/:id/steps/order')
  @ParishAccess('parish.celebrations.write', 'sheet')
  reorder(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(reorderSheetStepsSchema)) dto: ReorderSheetStepsDto,
  ) {
    return this.service.reorderSteps(id, dto);
  }

  @Patch('sheets/:id/steps/:stepId')
  @ParishAccess('parish.celebrations.write', 'sheet')
  updateStep(
    @Param('id') id: string,
    @Param('stepId') stepId: string,
    @Body(new ZodValidationPipe(updateCelebrationStepSchema)) dto: UpdateCelebrationStepDto,
  ) {
    return this.service.updateStep(id, stepId, dto);
  }

  @Delete('sheets/:id/steps/:stepId')
  @ParishAccess('parish.celebrations.write', 'sheet')
  removeStep(@Param('id') id: string, @Param('stepId') stepId: string) {
    return this.service.removeStep(id, stepId);
  }

  @Post('sheets/:id/publish')
  @ParishAccess('parish.celebrations.write', 'sheet')
  publish(@Param('id') id: string) {
    return this.service.publish(id);
  }

  @Post('sheets/:id/unpublish')
  @ParishAccess('parish.celebrations.write', 'sheet')
  unpublish(@Param('id') id: string) {
    return this.service.unpublish(id);
  }
}
