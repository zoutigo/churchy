import { Controller, Post, Get, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ContentsService } from './contents.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  createContentSchema,
  updateContentSchema,
  type CreateContentDto,
  type UpdateContentDto,
} from '@churchy/shared';
import { ParishRolesGuard } from '../../common/guards/parish-roles.guard';
import { ALL_MEMBERS, EDITORS, ParishAccess } from '../../common/decorators/roles.decorator';

@ApiTags('contents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ParishRolesGuard)
@Controller()
export class ContentsController {
  constructor(private service: ContentsService) {}

  @Post('parishes/:parishId/contents')
  @ParishAccess(EDITORS)
  create(
    @Param('parishId') parishId: string,
    @Body(new ZodValidationPipe(createContentSchema)) dto: CreateContentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.create(parishId, dto, user.id);
  }

  @Get('parishes/:parishId/contents')
  @ParishAccess(ALL_MEMBERS)
  findByParish(@Param('parishId') parishId: string) {
    return this.service.findByParish(parishId);
  }

  @Get('contents/:id')
  @ParishAccess(ALL_MEMBERS, 'content')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Patch('contents/:id')
  @ParishAccess(EDITORS, 'content')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateContentSchema)) dto: UpdateContentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.update(id, dto, user.id);
  }

  @Delete('contents/:id')
  @ParishAccess(EDITORS, 'content')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.remove(id, user.id);
  }
}
