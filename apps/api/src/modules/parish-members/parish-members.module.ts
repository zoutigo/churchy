import { Module } from '@nestjs/common';
import { ParishMembersController } from './parish-members.controller';
import { ParishMembersService } from './parish-members.service';

@Module({
  controllers: [ParishMembersController],
  providers: [ParishMembersService],
})
export class ParishMembersModule {}
