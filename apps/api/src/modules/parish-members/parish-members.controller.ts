import { Controller, Post, Get, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ParishMembersService } from './parish-members.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ParishRolesGuard } from '../../common/guards/parish-roles.guard';
import { ParishRoles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { inviteMemberSchema, ParishRole } from '@churchy/shared';

@ApiTags('parish-members')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ParishRolesGuard)
@Controller('parishes/:parishId/members')
export class ParishMembersController {
  constructor(private service: ParishMembersService) {}

  @Post()
  @ParishRoles(ParishRole.PARISH_ADMIN)
  invite(
    @Param('parishId') parishId: string,
    @Body(new ZodValidationPipe(inviteMemberSchema)) dto: any,
  ) {
    return this.service.invite(parishId, dto);
  }

  @Get()
  @ParishRoles(ParishRole.PARISH_ADMIN, ParishRole.PREPARER)
  findAll(@Param('parishId') parishId: string) {
    return this.service.findByParish(parishId);
  }

  @Delete(':userId')
  @ParishRoles(ParishRole.PARISH_ADMIN)
  remove(@Param('parishId') parishId: string, @Param('userId') userId: string) {
    return this.service.remove(parishId, userId);
  }
}
