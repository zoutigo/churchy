import { Controller, Post, Get, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ContentsService } from './contents.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { createContentSchema, updateContentSchema } from '@churchy/shared';

@ApiTags('contents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class ContentsController {
  constructor(private service: ContentsService) {}

  @Post('parishes/:parishId/contents')
  create(
    @Param('parishId') parishId: string,
    @Body(new ZodValidationPipe(createContentSchema)) dto: any,
    @CurrentUser() user: any,
  ) {
    return this.service.create(parishId, dto, user.id);
  }

  @Get('parishes/:parishId/contents')
  findByParish(@Param('parishId') parishId: string) {
    return this.service.findByParish(parishId);
  }

  @Get('contents/:id')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Patch('contents/:id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateContentSchema)) dto: any,
    @CurrentUser() user: any,
  ) {
    return this.service.update(id, dto, user.id);
  }

  @Delete('contents/:id')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.remove(id, user.id);
  }
}
