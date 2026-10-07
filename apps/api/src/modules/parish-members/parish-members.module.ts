import { Module } from '@nestjs/common';
import { ParishFollowController, ParishMembersController } from './parish-members.controller';
import { ParishMembersService } from './parish-members.service';

@Module({
  controllers: [ParishFollowController, ParishMembersController],
  providers: [ParishMembersService],
})
export class ParishMembersModule {}
